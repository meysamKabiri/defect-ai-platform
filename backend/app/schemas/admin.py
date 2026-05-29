from datetime import datetime

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field

from app.core.roles import UserRole


class AdminUserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    limit: int
    offset: int


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)
    full_name: str | None = None
    role: UserRole = UserRole.ENGINEER
    is_active: bool = True


class UpdateUserRoleRequest(BaseModel):
    role: UserRole


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    owner_id: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    limit: int
    offset: int


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    owner_id: str | None = None


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    owner_id: str | None = None
    is_active: bool | None = None
