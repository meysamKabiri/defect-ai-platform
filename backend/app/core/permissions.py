from collections.abc import Iterable
from enum import Enum
from typing import Protocol

from app.core.roles import UserRole


class Permission(str, Enum):
    JOB_READ = "job:read"
    JOB_READ_ALL = "job:read_all"
    JOB_CREATE = "job:create"
    JOB_PROCESS = "job:process"
    JOB_DELETE = "job:delete"
    PROJECT_MANAGE = "project:manage"
    USER_MANAGE = "user:manage"
    ROLE_MANAGE = "role:manage"
    MODEL_MANAGE = "model:manage"


ROLE_PERMISSIONS: dict[UserRole, frozenset[Permission]] = {
    UserRole.SUPER_ADMIN: frozenset(Permission),
    UserRole.ADMIN: frozenset(
        {
            Permission.JOB_READ,
            Permission.JOB_READ_ALL,
            Permission.JOB_CREATE,
            Permission.JOB_PROCESS,
            Permission.JOB_DELETE,
            Permission.USER_MANAGE,
            Permission.PROJECT_MANAGE,
            Permission.MODEL_MANAGE,
        }
    ),
    UserRole.ENGINEER: frozenset(
        {
            Permission.JOB_READ,
            Permission.JOB_CREATE,
            Permission.JOB_PROCESS,
        }
    ),
    UserRole.VIEWER: frozenset(
        {
            Permission.JOB_READ,
        }
    ),
}

ROLE_RANK: dict[UserRole, int] = {
    UserRole.VIEWER: 10,
    UserRole.ENGINEER: 20,
    UserRole.ADMIN: 30,
    UserRole.SUPER_ADMIN: 40,
}


class RolePrincipal(Protocol):
    role: UserRole | str


class JobResource(Protocol):
    user_id: str | None
    project_id: str | None


def normalize_role(role: UserRole | str) -> UserRole:
    if isinstance(role, UserRole):
        return role
    try:
        return UserRole(role)
    except ValueError:
        return UserRole[role]


def get_role_permissions(role: UserRole | str) -> frozenset[Permission]:
    return ROLE_PERMISSIONS[normalize_role(role)]


def has_permission(
    principal: RolePrincipal | UserRole | str,
    permission: Permission,
) -> bool:
    role = principal.role if hasattr(principal, "role") else principal
    return permission in get_role_permissions(role)


def has_permissions(
    principal: RolePrincipal | UserRole | str,
    permissions: Iterable[Permission],
) -> bool:
    role = principal.role if hasattr(principal, "role") else principal
    role_permissions = get_role_permissions(role)
    return all(permission in role_permissions for permission in permissions)


def is_at_least_role(
    principal: RolePrincipal | UserRole | str,
    minimum_role: UserRole,
) -> bool:
    role = principal.role if hasattr(principal, "role") else principal
    return ROLE_RANK[normalize_role(role)] >= ROLE_RANK[minimum_role]


def can_manage_role(
    actor: RolePrincipal,
    target_role: UserRole | str,
) -> bool:
    actor_role = normalize_role(actor.role)
    normalized_target_role = normalize_role(target_role)

    if actor_role == UserRole.SUPER_ADMIN:
        return True

    if actor_role == UserRole.ADMIN:
        return ROLE_RANK[normalized_target_role] < ROLE_RANK[UserRole.ADMIN]

    return False


def can_access_job(
    principal: RolePrincipal,
    job: JobResource,
    *,
    permission: Permission = Permission.JOB_READ,
    user_id: str | None = None,
    organization_id: str | None = None,
) -> bool:
    """Authorize a user against a job resource.

    ``user_id`` and ``organization_id`` are extension points for future
    tenant-aware and team-aware authorization without changing route code.
    """

    if not has_permission(principal, permission):
        return False

    if has_permission(principal, Permission.JOB_READ_ALL):
        return True

    effective_user_id = user_id or getattr(principal, "id", None)
    if effective_user_id is not None and job.user_id == str(effective_user_id):
        return True

    # Future SaaS extension point: compare organization/team membership here.
    return organization_id is not None and job.project_id == organization_id
