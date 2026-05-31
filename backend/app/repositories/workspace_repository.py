from datetime import datetime

from sqlalchemy import Select
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.workspace_roles import InvitationStatus
from app.core.workspace_roles import MembershipStatus
from app.db.models.user import User
from app.db.models.workspace import Workspace
from app.db.models.workspace import WorkspaceInvitation
from app.db.models.workspace import WorkspaceMembership


class WorkspaceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_workspace(
        self,
        *,
        name: str,
        slug: str,
        created_by_user_id: str | None,
    ) -> Workspace:
        workspace = Workspace(
            name=name,
            slug=slug,
            created_by_user_id=created_by_user_id,
        )
        self.session.add(workspace)
        await self.session.flush()
        return workspace

    async def get_workspace(self, workspace_id: str) -> Workspace | None:
        result = await self.session.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Workspace | None:
        result = await self.session.execute(
            select(Workspace).where(Workspace.slug == slug)
        )
        return result.scalar_one_or_none()

    async def create_membership(
        self,
        *,
        workspace_id: str,
        user_id: str,
        role: str,
        status: str = MembershipStatus.ACTIVE.value,
    ) -> WorkspaceMembership:
        membership = WorkspaceMembership(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
            status=status,
        )
        self.session.add(membership)
        await self.session.flush()
        return membership

    async def get_membership(
        self,
        *,
        workspace_id: str,
        user_id: str,
    ) -> WorkspaceMembership | None:
        result = await self.session.execute(
            select(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_active_membership(
        self,
        *,
        workspace_id: str,
        user_id: str,
    ) -> WorkspaceMembership | None:
        result = await self.session.execute(
            select(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.user_id == user_id,
                WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
            )
        )
        return result.scalar_one_or_none()

    async def list_user_memberships(self, user_id: str) -> list[WorkspaceMembership]:
        result = await self.session.execute(
            select(WorkspaceMembership)
            .options(selectinload(WorkspaceMembership.workspace))
            .where(
                WorkspaceMembership.user_id == user_id,
                WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
            )
            .order_by(WorkspaceMembership.created_at.asc())
        )
        return list(result.scalars().unique())

    async def list_members(self, workspace_id: str) -> list[WorkspaceMembership]:
        result = await self.session.execute(
            select(WorkspaceMembership)
            .options(selectinload(WorkspaceMembership.user))
            .where(WorkspaceMembership.workspace_id == workspace_id)
            .order_by(WorkspaceMembership.created_at.asc())
        )
        return list(result.scalars().unique())

    async def count_active_owners(
        self,
        *,
        workspace_id: str,
    ) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.role == "OWNER",
                WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
            )
        )
        return result.scalar_one()

    async def create_invitation(
        self,
        *,
        workspace_id: str,
        email: str,
        role: str,
        token_hash: str,
        invited_by_user_id: str,
        expires_at: datetime,
    ) -> WorkspaceInvitation:
        invitation = WorkspaceInvitation(
            workspace_id=workspace_id,
            email=email,
            role=role,
            token_hash=token_hash,
            invited_by_user_id=invited_by_user_id,
            status=InvitationStatus.PENDING.value,
            expires_at=expires_at,
        )
        self.session.add(invitation)
        await self.session.flush()
        return invitation

    async def get_invitation(self, invitation_id: str) -> WorkspaceInvitation | None:
        result = await self.session.execute(
            select(WorkspaceInvitation).where(WorkspaceInvitation.id == invitation_id)
        )
        return result.scalar_one_or_none()

    async def get_invitation_by_token_hash(
        self,
        token_hash: str,
    ) -> WorkspaceInvitation | None:
        result = await self.session.execute(
            select(WorkspaceInvitation)
            .options(selectinload(WorkspaceInvitation.workspace))
            .where(WorkspaceInvitation.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def list_invitations(self, workspace_id: str) -> list[WorkspaceInvitation]:
        result = await self.session.execute(
            select(WorkspaceInvitation)
            .where(WorkspaceInvitation.workspace_id == workspace_id)
            .order_by(WorkspaceInvitation.created_at.desc())
        )
        return list(result.scalars())

    async def get_pending_invitation(
        self,
        *,
        workspace_id: str,
        email: str,
    ) -> WorkspaceInvitation | None:
        result = await self.session.execute(
            select(WorkspaceInvitation).where(
                WorkspaceInvitation.workspace_id == workspace_id,
                WorkspaceInvitation.email == email,
                WorkspaceInvitation.status == InvitationStatus.PENDING.value,
            )
        )
        return result.scalar_one_or_none()

    async def active_member_by_email(
        self,
        *,
        workspace_id: str,
        email: str,
    ) -> WorkspaceMembership | None:
        statement: Select[tuple[WorkspaceMembership]] = (
            select(WorkspaceMembership)
            .join(User, WorkspaceMembership.user_id == User.id)
            .where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
                User.email == email,
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
