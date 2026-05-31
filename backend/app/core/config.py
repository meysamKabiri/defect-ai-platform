from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        extra="ignore",
    )

    APP_NAME: str
    API_V1_PREFIX: str

    DEBUG: bool

    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    UPLOAD_DIR: str
    OUTPUT_DIR: str

    ALLOWED_ORIGINS: list[str] = []
    FRONTEND_URL: str = "http://localhost:5173"
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

    DETECTION_CONFIDENCE_THRESHOLD: float = 0.4

    def resolve_backend_path(self, path: str) -> Path:
        configured_path = Path(path)
        if configured_path.is_absolute():
            return configured_path
        return BACKEND_DIR / configured_path

    @property
    def upload_path(self) -> Path:
        return self.resolve_backend_path(self.UPLOAD_DIR)

    @property
    def output_path(self) -> Path:
        return self.resolve_backend_path(self.OUTPUT_DIR)


settings = Settings()
