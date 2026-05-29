from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_authenticated
from app.core.database import get_db_session
from app.core.permissions import Permission
from app.core.permissions import has_permission
from app.db.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.admin import ProjectListResponse

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


@router.get(
    "/my",
    response_model=ProjectListResponse,
)
async def list_my_projects(
    search: str | None = None,
    is_active: bool | None = True,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    owner_id = (
        None
        if has_permission(current_user, Permission.PROJECT_MANAGE)
        else current_user.id
    )
    projects, total = await ProjectRepository(db).list_projects(
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
