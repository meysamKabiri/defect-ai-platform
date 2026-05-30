from datetime import datetime

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field

from app.core.workspace_roles import InvitationStatus
from app.core.workspace_roles import MembershipStatus
from app.core.workspace_roles import WorkspaceRole


class WorkspaceCreateRequest(BaseModel):
    workspace_name: str = Field(min_length=2, max_length=255)
    owner_full_name: str | None = Field(default=None, max_length=255)
    owner_email: EmailStr
    password: str = Field(min_length=6)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str

    class Config:
        from_attributes = True


class WorkspaceMembershipSummary(BaseModel):
    id: str
    name: str
    slug: str
    role: WorkspaceRole


class CurrentMembershipResponse(BaseModel):
    role: WorkspaceRole
    status: MembershipStatus = MembershipStatus.ACTIVE


class WorkspaceAuthResponse(BaseModel):
    user: dict
    accessToken: str
    refreshToken: str | None = None
    workspace: WorkspaceResponse | None = None
    membership: CurrentMembershipResponse | None = None
    workspaces: list[WorkspaceMembershipSummary] = []
    current_workspace: WorkspaceMembershipSummary | None = None


class InvitationCreateRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.ENGINEER


class InvitationAcceptRequest(BaseModel):
    token: str
    full_name: str | None = Field(default=None, max_length=255)
    password: str = Field(min_length=6)


class InvitationResponse(BaseModel):
    id: str
    workspace_id: str
    email: EmailStr
    role: WorkspaceRole
    status: InvitationStatus
    expires_at: datetime
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None
    invited_by_user_id: str | None = None
    created_at: datetime
    updated_at: datetime
    invite_url: str | None = None


class InvitationListResponse(BaseModel):
    items: list[InvitationResponse]


class MemberResponse(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str | None = None
    role: WorkspaceRole
    status: MembershipStatus
    joined_at: datetime


class MemberListResponse(BaseModel):
    items: list[MemberResponse]


class MemberRoleUpdateRequest(BaseModel):
    role: WorkspaceRole
