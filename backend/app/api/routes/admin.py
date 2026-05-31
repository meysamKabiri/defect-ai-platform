from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import Response
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_super_admin
from app.core.database import get_db_session
from app.core.roles import UserRole
from app.db.models.user import User
from app.schemas.admin import AdminCreateUserRequest
from app.schemas.admin import AdminUserResponse
from app.schemas.admin import ProjectCreateRequest
from app.schemas.admin import ProjectListResponse
from app.schemas.admin import ProjectResponse
from app.schemas.admin import ProjectUpdateRequest
from app.schemas.admin import UpdateUserRoleRequest
from app.schemas.admin import UpdateUserStatusRequest
from app.schemas.admin import UserListResponse
from app.services.admin_service import AdminService

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get(
    "/users",
    response_model=UserListResponse,
)
async def list_users(
    search: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin()),
):
    service = AdminService(db)
    users, total = await service.list_users(
        search=search,
        role=role,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return {
        "items": users,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: AdminCreateUserRequest,
    _: User = Depends(require_super_admin()),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Direct user creation is disabled. Invite users from a workspace instead.",
    )


@router.patch(
    "/users/{user_id}/role",
    response_model=AdminUserResponse,
)
async def update_user_role(
    user_id: str,
    payload: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db_session),
    actor: User = Depends(require_super_admin()),
):
    return await AdminService(db).update_user_role(
        actor=actor,
        user_id=user_id,
        role=payload.role,
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserResponse,
)
async def update_user_status(
    user_id: str,
    payload: UpdateUserStatusRequest,
    db: AsyncSession = Depends(get_db_session),
    actor: User = Depends(require_super_admin()),
):
    return await AdminService(db).update_user_status(
        actor=actor,
        user_id=user_id,
        is_active=payload.is_active,
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    actor: User = Depends(require_super_admin()),
):
    await AdminService(db).delete_user(actor=actor, user_id=user_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return None


@router.get(
    "/roles",
    response_model=list[str],
)
async def list_roles(
    _: Annotated[User, Depends(require_super_admin())],
):
    return [role.value for role in UserRole]


@router.get(
    "/projects",
    response_model=ProjectListResponse,
)
async def list_projects(
    search: str | None = None,
    owner_id: str | None = None,
    is_active: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin()),
):
    service = AdminService(db)
    projects, total = await service.list_projects(
        search=search,
        owner_id=owner_id,
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
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    payload: ProjectCreateRequest,
    _: User = Depends(require_super_admin()),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Global project creation is disabled. Create projects inside a workspace instead.",
    )


@router.patch(
    "/projects/{project_id}",
    response_model=ProjectResponse,
)
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    _: User = Depends(require_super_admin()),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Global project updates are disabled. Update projects inside a workspace instead.",
    )


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project(
    project_id: str,
    response: Response,
    _: User = Depends(require_super_admin()),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Global project deletion is disabled. Delete projects inside a workspace instead.",
    )
