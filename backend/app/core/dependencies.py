from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.repositories.auth_repository import AuthRepository
from app.core.database import get_db_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

repository = AuthRepository()


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db=Depends(get_db_session),
):
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
        )

    user = await repository.get_user_by_id(
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
            detail="Token has been revoked",
        )

    return user
