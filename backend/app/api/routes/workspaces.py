from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Response
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_authenticated
from app.core.database import get_db_session
from app.core.workspace_roles import WorkspaceRole
from app.db.models.user import User
from app.schemas.admin import ProjectCreateRequest
from app.schemas.admin import ProjectListResponse
from app.schemas.admin import ProjectResponse
from app.schemas.admin import ProjectUpdateRequest
from app.schemas.workspace import InvitationAcceptRequest
from app.schemas.workspace import InvitationCreateRequest
from app.schemas.workspace import InvitationListResponse
from app.schemas.workspace import InvitationResponse
from app.schemas.workspace import MemberListResponse
from app.schemas.workspace import MemberResponse
from app.schemas.workspace import MemberRoleUpdateRequest
from app.schemas.workspace import WorkspaceAuthResponse
from app.schemas.workspace import WorkspaceCreateRequest
from app.services.admin_service import AdminService
from app.services.workspace_service import WorkspaceService
from app.services.workspace_service import build_invite_url

router = APIRouter(tags=["Workspaces"])


@router.post(
    "/workspaces",
    response_model=WorkspaceAuthResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace(
    payload: WorkspaceCreateRequest,
    db: AsyncSession = Depends(get_db_session),
):
    return await WorkspaceService(db).create_workspace(payload)


@router.post(
    "/invitations/accept",
    response_model=WorkspaceAuthResponse,
    response_model_exclude_none=True,
)
async def accept_invitation(
    payload: InvitationAcceptRequest,
    db: AsyncSession = Depends(get_db_session),
):
    return await WorkspaceService(db).accept_invitation(
        token=payload.token,
        full_name=payload.full_name,
        password=payload.password,
    )


@router.post(
    "/workspaces/{workspace_id}/invitations",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    workspace_id: str,
    payload: InvitationCreateRequest,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    invitation, raw_token = await WorkspaceService(db).invite_user(
        workspace_id=workspace_id,
        actor=current_user,
        payload=payload,
    )
    return _serialize_invitation(invitation, raw_token=raw_token)


@router.get(
    "/workspaces/{workspace_id}/invitations",
    response_model=InvitationListResponse,
)
async def list_invitations(
    workspace_id: str,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    service = WorkspaceService(db)
    await service.require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
    )
    invitations = await service.workspaces.list_invitations(workspace_id)
    return {"items": [_serialize_invitation(invitation) for invitation in invitations]}


@router.post(
    "/workspaces/{workspace_id}/invitations/{invitation_id}/revoke",
    response_model=InvitationResponse,
)
async def revoke_invitation(
    workspace_id: str,
    invitation_id: str,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    invitation = await WorkspaceService(db).revoke_invitation(
        workspace_id=workspace_id,
        invitation_id=invitation_id,
        actor=current_user,
    )
    return _serialize_invitation(invitation)


@router.post(
    "/workspaces/{workspace_id}/invitations/{invitation_id}/resend",
    response_model=InvitationResponse,
)
async def resend_invitation(
    workspace_id: str,
    invitation_id: str,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    invitation, raw_token = await WorkspaceService(db).resend_invitation(
        workspace_id=workspace_id,
        invitation_id=invitation_id,
        actor=current_user,
    )
    return _serialize_invitation(invitation, raw_token=raw_token)


@router.get(
    "/workspaces/{workspace_id}/members",
    response_model=MemberListResponse,
)
async def list_members(
    workspace_id: str,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    service = WorkspaceService(db)
    await service.require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
    )
    members = await service.list_members(workspace_id)
    return {"items": [_serialize_member(member) for member in members]}


@router.patch(
    "/workspaces/{workspace_id}/members/{user_id}/role",
    response_model=MemberResponse,
)
async def update_member_role(
    workspace_id: str,
    user_id: str,
    payload: MemberRoleUpdateRequest,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    member = await WorkspaceService(db).update_member_role(
        workspace_id=workspace_id,
        user_id=user_id,
        actor=current_user,
        payload=payload,
    )
    return _serialize_member(member)


@router.delete(
    "/workspaces/{workspace_id}/members/{user_id}",
    response_model=MemberResponse,
)
async def remove_member(
    workspace_id: str,
    user_id: str,
    response: Response,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    member = await WorkspaceService(db).remove_member(
        workspace_id=workspace_id,
        user_id=user_id,
        actor=current_user,
    )
    response.status_code = status.HTTP_200_OK
    return _serialize_member(member)


@router.get(
    "/workspaces/{workspace_id}/projects",
    response_model=ProjectListResponse,
)
async def list_workspace_projects(
    workspace_id: str,
    current_user: Annotated[User, Depends(require_authenticated())],
    search: str | None = None,
    owner_id: str | None = None,
    is_active: bool | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db_session),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    projects, total = await AdminService(db).list_projects(
        search=search,
        owner_id=owner_id,
        workspace_id=workspace_id,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return {
        "items": projects,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/workspaces/{workspace_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace_project(
    workspace_id: str,
    payload: ProjectCreateRequest,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
    )
    return await AdminService(db).create_project(payload, workspace_id=workspace_id)


@router.patch(
    "/workspaces/{workspace_id}/projects/{project_id}",
    response_model=ProjectResponse,
)
async def update_workspace_project(
    workspace_id: str,
    project_id: str,
    payload: ProjectUpdateRequest,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
    )
    return await AdminService(db).update_project(
        project_id,
        payload,
        workspace_id=workspace_id,
    )


@router.delete(
    "/workspaces/{workspace_id}/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_workspace_project(
    workspace_id: str,
    project_id: str,
    response: Response,
    current_user: Annotated[User, Depends(require_authenticated())],
    db: AsyncSession = Depends(get_db_session),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
    )
    await AdminService(db).delete_project(project_id, workspace_id=workspace_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return None


def _serialize_invitation(invitation, raw_token: str | None = None) -> InvitationResponse:
    return InvitationResponse(
        id=invitation.id,
        workspace_id=invitation.workspace_id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        revoked_at=invitation.revoked_at,
        invited_by_user_id=invitation.invited_by_user_id,
        created_at=invitation.created_at,
        updated_at=invitation.updated_at,
        invite_url=build_invite_url(raw_token) if raw_token else None,
    )


def _serialize_member(member) -> MemberResponse:
    return MemberResponse(
        user_id=member.user_id,
        email=member.user.email,
        full_name=member.user.full_name,
        role=member.role,
        status=member.status,
        joined_at=member.created_at,
    )
