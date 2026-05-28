from fastapi import HTTPException
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import can_manage_role
from app.core.security import hash_password
from app.core.roles import UserRole
from app.db.models.project import Project
from app.db.models.user import User
from app.repositories.auth_repository import AuthRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.admin import AdminCreateUserRequest
from app.schemas.admin import ProjectCreateRequest
from app.schemas.admin import ProjectUpdateRequest


class AdminService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = AuthRepository()
        self.projects = ProjectRepository(session)

    async def list_users(
        self,
        *,
        search: str | None,
        role: UserRole | None,
        is_active: bool | None,
        limit: int,
        offset: int,
    ) -> tuple[list[User], int]:
        return await self.users.list_users(
            self.session,
            search=search,
            role=role,
            is_active=is_active,
            limit=limit,
            offset=offset,
        )

    async def create_user(
        self,
        *,
        actor: User,
        payload: AdminCreateUserRequest,
    ) -> User:
        if not can_manage_role(actor, payload.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot create users with this role",
            )

        existing = await self.users.get_user_by_email(self.session, payload.email.lower())
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        user = User(
            email=payload.email.lower(),
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            role=payload.role,
            is_active=payload.is_active,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update_user_role(
        self,
        *,
        actor: User,
        user_id: str,
        role: UserRole,
    ) -> User:
        user = await self._get_user_or_404(user_id)

        if actor.id == user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change your own role",
            )

        if not can_manage_role(actor, user.role) or not can_manage_role(actor, role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot assign or manage this role",
            )

        user.role = role
        user.token_version += 1
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update_user_status(
        self,
        *,
        actor: User,
        user_id: str,
        is_active: bool,
    ) -> User:
        user = await self._get_user_or_404(user_id)

        if actor.id == user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change your own active status",
            )

        if not can_manage_role(actor, user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot manage this user",
            )

        user.is_active = is_active
        user.token_version += 1
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete_user(
        self,
        *,
        actor: User,
        user_id: str,
    ) -> None:
        user = await self._get_user_or_404(user_id)

        if actor.id == user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot delete your own user",
            )

        if not can_manage_role(actor, user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot delete this user",
            )

        await self.users.delete_user(self.session, user)
        await self.session.commit()

    async def list_projects(
        self,
        *,
        search: str | None,
        owner_id: str | None,
        is_active: bool | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Project], int]:
        return await self.projects.list_projects(
            search=search,
            owner_id=owner_id,
            is_active=is_active,
            limit=limit,
            offset=offset,
        )

    async def create_project(self, payload: ProjectCreateRequest) -> Project:
        if payload.owner_id is not None:
            await self._get_user_or_404(payload.owner_id)

        project = await self.projects.create_project(
            name=payload.name,
            description=payload.description,
            owner_id=payload.owner_id,
        )
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def update_project(
        self,
        project_id: str,
        payload: ProjectUpdateRequest,
    ) -> Project:
        project = await self._get_project_or_404(project_id)

        if payload.name is not None:
            project.name = payload.name
        if payload.description is not None:
            project.description = payload.description
        if payload.owner_id is not None:
            await self._get_user_or_404(payload.owner_id)
            project.owner_id = payload.owner_id
        if payload.is_active is not None:
            project.is_active = payload.is_active

        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete_project(self, project_id: str) -> None:
        project = await self._get_project_or_404(project_id)
        await self.projects.delete_project(project)
        await self.session.commit()

    async def _get_user_or_404(self, user_id: str) -> User:
        user = await self.users.get_user_by_id(self.session, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    async def _get_project_or_404(self, project_id: str) -> Project:
        project = await self.projects.get_project(project_id)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        return project
