from typing import Annotated

from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from fastapi.security import OAuth2PasswordBearer

from app.core.database import get_db_session
from app.core.security import decode_token
from app.repositories.auth_repository import AuthRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

repository = AuthRepository()


def _authentication_error(detail: str = "Invalid token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db=Depends(get_db_session),
):
    payload = decode_token(token)

    if not payload:
        raise _authentication_error()

    if payload.get("type") != "access":
        raise _authentication_error("Invalid token type")

    user_id = payload.get("user_id") or payload.get("sub")

    if not user_id:
        raise _authentication_error()

    user = await repository.get_user_by_id(
        db,
        str(user_id),
    )

    if not user or not user.is_active:
        raise _authentication_error("User not found")

    token_version = payload.get("token_version", payload.get("ver"))
    if token_version != user.token_version:
        raise _authentication_error("Token has been revoked")

    return user
