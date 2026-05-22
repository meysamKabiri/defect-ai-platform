from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    APP_NAME: str
    API_V1_PREFIX: str

    DEBUG: bool

    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int

    UPLOAD_DIR: str
    OUTPUT_DIR: str

    ALLOWED_ORIGINS: list[str] = []
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_IMAGE_EXTENSIONS: list[str] = [
        ".jpg",
        ".jpeg",
        ".png",
    ]

    MYSQL_ROOT_PASSWORD: str | None = None
    MYSQL_DATABASE: str | None = None
    MYSQL_USER: str | None = None
    MYSQL_PASSWORD: str | None = None


settings = Settings()
