from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    accessToken: str
    refreshToken: str | None = None


class RefreshTokenRequest(BaseModel):
    refreshToken: str | None = None
