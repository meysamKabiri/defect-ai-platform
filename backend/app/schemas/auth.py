from pydantic import BaseModel, EmailStr

from app.core.roles import UserRole
from app.schemas.workspace import WorkspaceMembershipSummary


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None = None
    role: UserRole

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    accessToken: str
    refreshToken: str | None = None
    workspaces: list[WorkspaceMembershipSummary] = []
    current_workspace: WorkspaceMembershipSummary | None = None


class RefreshTokenRequest(BaseModel):
    refreshToken: str | None = None
