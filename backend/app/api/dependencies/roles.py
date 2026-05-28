from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi import HTTPException
from fastapi import Path
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_user
from app.core.permissions import Permission
from app.core.permissions import can_access_job
from app.core.permissions import has_permissions
from app.core.permissions import has_permission
from app.core.permissions import normalize_role
from app.core.roles import UserRole
from app.db.models.detection import DetectionJob
from app.db.models.user import User
from app.services.detection_persistence_service import DetectionPersistenceService


def unauthorized_exception(detail: str = "Authentication required") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def forbidden_exception(detail: str = "Insufficient permissions") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def require_authenticated() -> Callable[..., User]:
    async def authenticated_user(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        return current_user

    return authenticated_user


def require_roles(*allowed_roles: UserRole) -> Callable[..., User]:
    allowed = set(allowed_roles)

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if normalize_role(current_user.role) not in allowed:
            raise forbidden_exception("Role is not allowed to access this resource")
        return current_user

    return role_checker


def require_permissions(*required_permissions: Permission) -> Callable[..., User]:
    required = tuple(required_permissions)

    async def permission_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if not has_permissions(current_user, required):
            raise forbidden_exception("Permission is required to access this resource")
        return current_user

    return permission_checker


def require_admin() -> Callable[..., User]:
    return require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)


def require_super_admin() -> Callable[..., User]:
    return require_roles(UserRole.SUPER_ADMIN)


def require_engineer() -> Callable[..., User]:
    return require_roles(UserRole.ADMIN, UserRole.ENGINEER)


def require_job_access(
    permission: Permission = Permission.JOB_READ,
) -> Callable[..., DetectionJob]:
    async def job_access_checker(
        job_id: Annotated[str, Path()],
        db: Annotated[AsyncSession, Depends(get_db_session)],
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> DetectionJob:
        if not has_permission(current_user, permission):
            raise forbidden_exception("Permission is required to access this job")

        service = DetectionPersistenceService(db)
        job = await service.get_job(job_id)

        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found",
            )

        if not can_access_job(
            current_user,
            job,
            permission=permission,
        ):
            raise forbidden_exception("You do not have access to this job")

        return job

    return job_access_checker
