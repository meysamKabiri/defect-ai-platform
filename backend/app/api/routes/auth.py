from time import monotonic

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status

from app.schemas.auth import (
    LoginRequest,
    AuthResponse,
    RefreshTokenRequest,
    UserResponse,
)

from app.services.auth_service import AuthService
from app.core.config import settings
from app.core.database import get_db_session
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)

auth_service = AuthService()

REFRESH_TOKEN_COOKIE = "refresh_token"
LOGIN_RATE_LIMIT_WINDOW_SECONDS = 5 * 60
LOGIN_RATE_LIMIT_MAX_FAILURES = 5
_failed_login_attempts: dict[str, list[float]] = {}


def _login_rate_limit_key(
    request: Request,
    email: str,
) -> str:
    client_host = request.client.host if request.client else "unknown"
    return f"{client_host}:{email.lower()}"


def _prune_login_attempts(key: str) -> list[float]:
    cutoff = monotonic() - LOGIN_RATE_LIMIT_WINDOW_SECONDS
    attempts = [
        attempted_at
        for attempted_at in _failed_login_attempts.get(key, [])
        if attempted_at >= cutoff
    ]
    _failed_login_attempts[key] = attempts
    return attempts


def _ensure_login_allowed(key: str) -> None:
    attempts = _prune_login_attempts(key)
    if len(attempts) >= LOGIN_RATE_LIMIT_MAX_FAILURES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
        )


def _record_failed_login(key: str) -> None:
    attempts = _prune_login_attempts(key)
    attempts.append(monotonic())
    _failed_login_attempts[key] = attempts


def _clear_failed_logins(key: str) -> None:
    _failed_login_attempts.pop(key, None)


def _set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path="/api/v1/auth",
    )


@router.post(
    "/create-user",
    response_model=AuthResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_user():
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Bootstrap user creation has been replaced by POST /api/v1/workspaces.",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    response_model_exclude_none=True,
)
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db=Depends(get_db_session),
):
    rate_limit_key = _login_rate_limit_key(request, payload.email)
    _ensure_login_allowed(rate_limit_key)

    try:
        session = await auth_service.login(
            db=db,
            email=payload.email,
            password=payload.password,
        )
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            _record_failed_login(rate_limit_key)
        raise

    _clear_failed_logins(rate_limit_key)
    refresh_token = session.pop("refreshToken")
    _set_refresh_cookie(response, refresh_token)

    return session


@router.post(
    "/refresh",
    response_model=AuthResponse,
    response_model_exclude_none=True,
)
async def refresh(
    response: Response,
    payload: RefreshTokenRequest | None = None,
    refresh_cookie: str | None = Cookie(
        default=None,
        alias=REFRESH_TOKEN_COOKIE,
    ),
    db=Depends(get_db_session),
):
    refresh_token = payload.refreshToken if payload else refresh_cookie

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    session = await auth_service.refresh_session(
        db=db,
        refresh_token=refresh_token,
    )
    new_refresh_token = session.pop("refreshToken")
    _set_refresh_cookie(response, new_refresh_token)

    return session


@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    current_user=Depends(get_current_user),
):
    return current_user


@router.post("/logout")
async def logout(
    response: Response,
    db=Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    result = await auth_service.logout(
        db=db,
        user=current_user,
    )
    _clear_refresh_cookie(response)

    return result
