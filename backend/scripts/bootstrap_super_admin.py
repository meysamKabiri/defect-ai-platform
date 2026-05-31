import argparse
import asyncio
import getpass

from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.database import engine
from app.core.roles import UserRole
from app.core.security import hash_password
from app.db.models.user import User
from app.repositories.auth_repository import AuthRepository


async def bootstrap_super_admin(
    *,
    email: str,
    password: str,
    full_name: str | None,
) -> None:
    repository = AuthRepository()

    try:
        async with AsyncSessionLocal() as session:
            try:
                await session.execute(
                    text(
                        "ALTER TABLE users MODIFY COLUMN role "
                        "ENUM('SUPER_ADMIN','ADMIN','ENGINEER','VIEWER') NOT NULL"
                    )
                )
                existing_super_admin = await repository.get_super_admin(session)
                if existing_super_admin is not None:
                    raise RuntimeError(
                        "A super-admin already exists. Bootstrap refused."
                    )

                existing_email = await repository.get_user_by_email(
                    session, email.lower()
                )
                if existing_email is not None:
                    existing_email.full_name = full_name or existing_email.full_name
                    existing_email.hashed_password = hash_password(password)
                    existing_email.role = UserRole.SUPER_ADMIN
                    existing_email.is_active = True
                    existing_email.token_version += 1
                    await session.commit()
                    return

                user = User(
                    email=email.lower(),
                    full_name=full_name,
                    hashed_password=hash_password(password),
                    role=UserRole.SUPER_ADMIN,
                    is_active=True,
                )
                session.add(user)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    finally:
        await engine.dispose()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create the first SUPER_ADMIN account exactly once.",
    )
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", default=None)
    parser.add_argument("--password", default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    password = args.password or getpass.getpass("Password: ")

    if len(password) < 6:
        raise SystemExit("Password must be at least 12 characters.")

    asyncio.run(
        bootstrap_super_admin(
            email=args.email,
            password=password,
            full_name=args.full_name,
        )
    )
    print("SUPER_ADMIN bootstrap complete.")


if __name__ == "__main__":
    main()
