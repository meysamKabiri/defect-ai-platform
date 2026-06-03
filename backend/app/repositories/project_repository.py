from sqlalchemy import Select
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.project import Project


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_project(
        self,
        *,
        name: str,
        description: str | None = None,
        owner_id: str | None = None,
        workspace_id: str | None = None,
    ) -> Project:
        project = Project(
            name=name,
            description=description,
            owner_id=owner_id,
            workspace_id=workspace_id,
        )
        self.session.add(project)
        await self.session.flush()
        return project

    async def get_project(
        self,
        project_id: str,
        workspace_id: str | None = None,
    ) -> Project | None:
        statement = select(Project).options(selectinload(Project.owner)).where(Project.id == project_id)
        if workspace_id is not None:
            statement = statement.where(Project.workspace_id == workspace_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_projects(
        self,
        *,
        search: str | None = None,
        owner_id: str | None = None,
        workspace_id: str | None = None,
        is_active: bool | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Project], int]:
        statement: Select[tuple[Project]] = select(Project).options(selectinload(Project.owner))

        if search:
            statement = statement.where(Project.name.ilike(f"%{search}%"))

        if owner_id is not None:
            statement = statement.where(Project.owner_id == owner_id)

        if workspace_id is not None:
            statement = statement.where(Project.workspace_id == workspace_id)

        if is_active is not None:
            statement = statement.where(Project.is_active == is_active)

        total_result = await self.session.execute(
            select(func.count()).select_from(statement.subquery())
        )
        total = total_result.scalar_one()

        page_result = await self.session.execute(
            statement.order_by(Project.created_at.desc()).limit(limit).offset(offset)
        )
        return list(page_result.scalars()), total

    async def delete_project(self, project: Project) -> None:
        await self.session.delete(project)
        await self.session.flush()
