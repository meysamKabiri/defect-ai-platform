from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy import Select

from app.db.models.user import User
from app.core.roles import UserRole


class AuthRepository:

    async def count_users(
        self,
        db: AsyncSession,
    ) -> int:
        result = await db.execute(select(func.count()).select_from(User))

        return result.scalar_one()

    async def get_user_by_email(
        self,
        db: AsyncSession,
        email: str,
    ):
        result = await db.execute(select(User).where(User.email == email))

        return result.scalar_one_or_none()

    async def get_user_by_id(
        self,
        db: AsyncSession,
        user_id: str,
    ):
        result = await db.execute(select(User).where(User.id == user_id))

        return result.scalar_one_or_none()

    async def get_super_admin(
        self,
        db: AsyncSession,
    ):
        result = await db.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN)
        )

        return result.scalar_one_or_none()

    async def list_users(
        self,
        db: AsyncSession,
        *,
        search: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[User], int]:
        statement: Select[tuple[User]] = select(User)

        if search:
            statement = statement.where(
                User.email.ilike(f"%{search}%")
                | User.full_name.ilike(f"%{search}%")
            )

        if role is not None:
            statement = statement.where(User.role == role)

        if is_active is not None:
            statement = statement.where(User.is_active == is_active)

        total_result = await db.execute(
            select(func.count()).select_from(statement.subquery())
        )
        total = total_result.scalar_one()

        page_result = await db.execute(
            statement.order_by(User.created_at.desc()).limit(limit).offset(offset)
        )
        return list(page_result.scalars()), total

    async def delete_user(
        self,
        db: AsyncSession,
        user: User,
    ) -> None:
        await db.delete(user)

    async def increment_token_version(
        self,
        db: AsyncSession,
        user: User,
    ):
        user.token_version += 1

        await db.commit()

        await db.refresh(user)

        return user

    async def create_user(
        self,
        db: AsyncSession,
        user: User,
    ):
        db.add(user)

        await db.commit()

        await db.refresh(user)

        return user
