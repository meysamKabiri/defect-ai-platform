from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.db.models.user import User


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
