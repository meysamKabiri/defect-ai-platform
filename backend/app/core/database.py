from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
)

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
