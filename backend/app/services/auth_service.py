from fastapi import HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.roles import UserRole

from app.db.models.user import User
from app.repositories.auth_repository import (
    AuthRepository,
)
from app.services.workspace_service import WorkspaceService


class AuthService:

    def __init__(self):
        self.repository = AuthRepository()

    async def _session_payload(
        self,
        db,
        user: User,
        *,
        access_token: str,
        refresh_token: str,
    ) -> dict:
        return await WorkspaceService(db).session_payload(
            user=user,
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def create_initial_user(
        self,
        db,
        email: str,
        password: str,
        full_name: str | None = None,
        role: UserRole = UserRole.ENGINEER,
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
            role=role,
        )

        user = await self.repository.create_user(
            db,
            user,
        )

        access_token = create_access_token(user.id, user.token_version, user.role)

        refresh_token = create_refresh_token(user.id, user.token_version, user.role)

        return await self._session_payload(
            db,
            user,
            access_token=access_token,
            refresh_token=refresh_token,
        )

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
            user.role,
        )

        refresh_token = create_refresh_token(
            user.id,
            user.token_version,
            user.role,
        )

        return await self._session_payload(
            db,
            user,
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def refresh_session(
        self,
        db,
        refresh_token: str,
    ):
        payload = decode_token(refresh_token)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        user_id = payload.get("user_id") or payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user = await self.repository.get_user_by_id(
            db,
            str(user_id),
        )

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        token_version = payload.get("token_version", payload.get("ver"))
        if token_version != user.token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        access_token = create_access_token(
            user.id,
            user.token_version,
            user.role,
        )

        refresh_token = create_refresh_token(
            user.id,
            user.token_version,
            user.role,
        )

        return await self._session_payload(
            db,
            user,
            access_token=access_token,
            refresh_token=refresh_token,
        )

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
