from fastapi import HTTPException, status

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

from app.db.models.user import User
from app.repositories.auth_repository import (
    AuthRepository,
)


class AuthService:

    def __init__(self):
        self.repository = AuthRepository()

    async def create_initial_user(
        self,
        db,
        email: str,
        password: str,
        full_name: str | None = None,
    ):
        user_count = await self.repository.count_users(db)

        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Initial user has already been created",
            )

        user = User(
            email=email.lower(),
            full_name=full_name,
            hashed_password=hash_password(password),
            is_active=True,
        )

        user = await self.repository.create_user(
            db,
            user,
        )

        access_token = create_access_token(
            user.id,
            user.token_version,
        )

        refresh_token = create_refresh_token(
            user.id,
            user.token_version,
        )

        return {
            "user": user,
            "accessToken": access_token,
            "refreshToken": refresh_token,
        }

    async def login(
        self,
        db,
        email: str,
        password: str,
    ):
        user = await self.repository.get_user_by_email(
            db,
            email,
        )

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not verify_password(
            password,
            user.hashed_password,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        access_token = create_access_token(
            user.id,
            user.token_version,
        )

        refresh_token = create_refresh_token(
            user.id,
            user.token_version,
        )

        return {
            "user": user,
            "accessToken": access_token,
            "refreshToken": refresh_token,
        }

    async def refresh_session(
        self,
        db,
        refresh_token: str,
    ):
        payload = decode_token(refresh_token)

        if not payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type",
            )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token",
            )

        user = await self.repository.get_user_by_id(
            db,
            str(user_id),
        )

        if not user or not user.is_active:
            raise HTTPException(
                status_code=401,
                detail="User not found",
            )

        if payload.get("ver") != user.token_version:
            raise HTTPException(
                status_code=401,
                detail="Refresh token has been revoked",
            )

        access_token = create_access_token(
            user.id,
            user.token_version,
        )

        refresh_token = create_refresh_token(
            user.id,
            user.token_version,
        )

        return {
            "user": user,
            "accessToken": access_token,
            "refreshToken": refresh_token,
        }

    async def logout(
        self,
        db,
        user,
    ):
        await self.repository.increment_token_version(
            db,
            user,
        )

        return {
            "success": True,
        }
