from datetime import datetime
from datetime import timedelta
from datetime import timezone
import hashlib
import re
import secrets

from fastapi import HTTPException
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.roles import UserRole
from app.core.security import create_access_token
from app.core.security import create_refresh_token
from app.core.security import hash_password
from app.core.workspace_roles import InvitationStatus
from app.core.workspace_roles import MembershipStatus
from app.core.workspace_roles import WorkspaceRole
from app.db.models.user import User
from app.db.models.workspace import WorkspaceInvitation
from app.db.models.workspace import WorkspaceMembership
from app.repositories.auth_repository import AuthRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import InvitationCreateRequest
from app.schemas.workspace import MemberRoleUpdateRequest
from app.schemas.workspace import WorkspaceCreateRequest


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "workspace"


class WorkspaceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = AuthRepository()
        self.workspaces = WorkspaceRepository(session)

    async def create_workspace(
        self,
        payload: WorkspaceCreateRequest,
    ) -> dict:
        email = payload.owner_email.lower()
        existing = await self.users.get_user_by_email(self.session, email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists. Log in and use invitations for existing workspaces.",
            )

        user = User(
            email=email,
            full_name=payload.owner_full_name,
            hashed_password=hash_password(payload.password),
            role=UserRole.ENGINEER,
            is_platform_admin=False,
            is_active=True,
        )
        self.session.add(user)
        await self.session.flush()

        workspace = await self.workspaces.create_workspace(
            name=payload.workspace_name,
            slug=await self._unique_slug(payload.workspace_name),
            created_by_user_id=user.id,
        )
        membership = await self.workspaces.create_membership(
            workspace_id=workspace.id,
            user_id=user.id,
            role=WorkspaceRole.OWNER.value,
        )

        await self.session.commit()
        await self.session.refresh(user)
        await self.session.refresh(workspace)
        await self.session.refresh(membership)

        access_token = create_access_token(user.id, user.token_version, user.role)
        refresh_token = create_refresh_token(user.id, user.token_version, user.role)
        memberships = await self.workspaces.list_user_memberships(user.id)
        return await self.session_payload(
            user=user,
            access_token=access_token,
            refresh_token=refresh_token,
            memberships=memberships,
        )

    async def session_payload(
        self,
        *,
        user: User,
        access_token: str,
        refresh_token: str,
        memberships: list[WorkspaceMembership] | None = None,
    ) -> dict:
        memberships = memberships or await self.workspaces.list_user_memberships(user.id)
        workspace_summaries = [
            {
                "id": membership.workspace.id,
                "name": membership.workspace.name,
                "slug": membership.workspace.slug,
                "role": membership.role,
            }
            for membership in memberships
            if membership.workspace is not None
        ]
        current_workspace = workspace_summaries[0] if workspace_summaries else None

        user_payload = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
        }
        if user.is_platform_admin:
            user_payload["platform_admin"] = True

        return {
            "user": user_payload,
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "workspaces": workspace_summaries,
            "current_workspace": current_workspace,
            "workspace": current_workspace,
            "membership": (
                {"role": current_workspace["role"], "status": MembershipStatus.ACTIVE.value}
                if current_workspace
                else None
            ),
        }

    async def require_membership(
        self,
        *,
        workspace_id: str,
        user: User,
        roles: set[WorkspaceRole] | None = None,
    ) -> WorkspaceMembership:
        membership = await self.workspaces.get_active_membership(
            workspace_id=workspace_id,
            user_id=user.id,
        )
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this workspace",
            )
        if roles is not None and WorkspaceRole(membership.role) not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace role is not allowed for this action",
            )
        return membership

    async def list_members(self, workspace_id: str) -> list[WorkspaceMembership]:
        return await self.workspaces.list_members(workspace_id)

    async def invite_user(
        self,
        *,
        workspace_id: str,
        actor: User,
        payload: InvitationCreateRequest,
    ) -> tuple[WorkspaceInvitation, str]:
        await self.require_membership(
            workspace_id=workspace_id,
            user=actor,
            roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
        )
        email = payload.email.lower()
        if await self.workspaces.active_member_by_email(workspace_id=workspace_id, email=email):
            raise HTTPException(status_code=409, detail="User is already an active workspace member")
        if await self.workspaces.get_pending_invitation(workspace_id=workspace_id, email=email):
            raise HTTPException(status_code=409, detail="A pending invitation already exists for this email")

        raw_token = secrets.token_urlsafe(32)
        invitation = await self.workspaces.create_invitation(
            workspace_id=workspace_id,
            email=email,
            role=payload.role.value,
            token_hash=hash_invitation_token(raw_token),
            invited_by_user_id=actor.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation, raw_token

    async def revoke_invitation(
        self,
        *,
        workspace_id: str,
        invitation_id: str,
        actor: User,
    ) -> WorkspaceInvitation:
        await self.require_membership(
            workspace_id=workspace_id,
            user=actor,
            roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
        )
        invitation = await self._get_workspace_invitation_or_404(workspace_id, invitation_id)
        invitation.status = InvitationStatus.REVOKED.value
        invitation.revoked_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation

    async def resend_invitation(
        self,
        *,
        workspace_id: str,
        invitation_id: str,
        actor: User,
    ) -> tuple[WorkspaceInvitation, str]:
        await self.require_membership(
            workspace_id=workspace_id,
            user=actor,
            roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
        )
        invitation = await self._get_workspace_invitation_or_404(workspace_id, invitation_id)
        raw_token = secrets.token_urlsafe(32)
        invitation.token_hash = hash_invitation_token(raw_token)
        invitation.status = InvitationStatus.PENDING.value
        invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        invitation.revoked_at = None
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation, raw_token

    async def accept_invitation(
        self,
        *,
        token: str,
        full_name: str | None,
        password: str,
    ) -> dict:
        invitation = await self.workspaces.get_invitation_by_token_hash(hash_invitation_token(token))
        if invitation is None:
            raise HTTPException(status_code=400, detail="Invalid invitation token")
        if invitation.status != InvitationStatus.PENDING.value:
            raise HTTPException(status_code=400, detail="Invitation is not pending")
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED.value
            await self.session.commit()
            raise HTTPException(status_code=400, detail="Invitation has expired")

        user = await self.users.get_user_by_email(self.session, invitation.email)
        if user is None:
            user = User(
                email=invitation.email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=UserRole.ENGINEER,
                is_platform_admin=False,
                is_active=True,
            )
            self.session.add(user)
            await self.session.flush()
        elif await self.workspaces.get_active_membership(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
        ):
            raise HTTPException(status_code=400, detail="User is already an active member")

        membership = await self.workspaces.get_membership(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
        )
        if membership is None:
            membership = await self.workspaces.create_membership(
                workspace_id=invitation.workspace_id,
                user_id=user.id,
                role=invitation.role,
            )
        else:
            membership.role = invitation.role
            membership.status = MembershipStatus.ACTIVE.value
            membership.removed_at = None

        invitation.status = InvitationStatus.ACCEPTED.value
        invitation.accepted_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(user)
        memberships = await self.workspaces.list_user_memberships(user.id)
        access_token = create_access_token(user.id, user.token_version, user.role)
        refresh_token = create_refresh_token(user.id, user.token_version, user.role)
        return await self.session_payload(
            user=user,
            access_token=access_token,
            refresh_token=refresh_token,
            memberships=memberships,
        )

    async def update_member_role(
        self,
        *,
        workspace_id: str,
        user_id: str,
        actor: User,
        payload: MemberRoleUpdateRequest,
    ) -> WorkspaceMembership:
        actor_membership = await self.require_membership(
            workspace_id=workspace_id,
            user=actor,
            roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
        )
        membership = await self._get_membership_or_404(workspace_id, user_id)
        self._ensure_can_manage_member(actor_membership, membership, payload.role)
        if membership.role == WorkspaceRole.OWNER.value and payload.role != WorkspaceRole.OWNER:
            await self._ensure_not_last_owner(workspace_id)
        membership.role = payload.role.value
        await self.session.commit()
        await self.session.refresh(membership)
        return membership

    async def remove_member(
        self,
        *,
        workspace_id: str,
        user_id: str,
        actor: User,
    ) -> WorkspaceMembership:
        actor_membership = await self.require_membership(
            workspace_id=workspace_id,
            user=actor,
            roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
        )
        membership = await self._get_membership_or_404(workspace_id, user_id)
        self._ensure_can_manage_member(actor_membership, membership, None)
        if membership.role == WorkspaceRole.OWNER.value:
            await self._ensure_not_last_owner(workspace_id)
        membership.status = MembershipStatus.REMOVED.value
        membership.removed_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(membership)
        return membership

    async def _unique_slug(self, name: str) -> str:
        base_slug = _slugify(name)
        slug = base_slug
        counter = 2
        while await self.workspaces.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    async def _get_workspace_invitation_or_404(
        self,
        workspace_id: str,
        invitation_id: str,
    ) -> WorkspaceInvitation:
        invitation = await self.workspaces.get_invitation(invitation_id)
        if invitation is None or invitation.workspace_id != workspace_id:
            raise HTTPException(status_code=404, detail="Invitation not found")
        return invitation

    async def _get_membership_or_404(
        self,
        workspace_id: str,
        user_id: str,
    ) -> WorkspaceMembership:
        membership = await self.workspaces.get_membership(
            workspace_id=workspace_id,
            user_id=user_id,
        )
        if membership is None:
            raise HTTPException(status_code=404, detail="Workspace member not found")
        return membership

    async def _ensure_not_last_owner(self, workspace_id: str) -> None:
        if await self.workspaces.count_active_owners(workspace_id=workspace_id) <= 1:
            raise HTTPException(status_code=400, detail="Workspace must keep at least one owner")

    def _ensure_can_manage_member(
        self,
        actor_membership: WorkspaceMembership,
        target: WorkspaceMembership,
        new_role: WorkspaceRole | None,
    ) -> None:
        actor_role = WorkspaceRole(actor_membership.role)
        target_role = WorkspaceRole(target.role)
        if actor_membership.user_id == target.user_id and target_role == WorkspaceRole.OWNER:
            raise HTTPException(status_code=400, detail="Owners cannot remove or demote themselves")
        if actor_role == WorkspaceRole.OWNER:
            return
        if target_role in {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}:
            raise HTTPException(status_code=403, detail="Admins cannot manage owners or admins")
        if new_role in {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}:
            raise HTTPException(status_code=403, detail="Admins cannot assign owner or admin roles")

def build_invite_url(token: str) -> str:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return f"{frontend_url.rstrip('/')}/accept-invite?token={token}"
