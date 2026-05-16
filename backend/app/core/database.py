from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str
    API_V1_PREFIX: str

    DEBUG: bool

    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int

    UPLOAD_DIR: str
    OUTPUT_DIR: str

    class Config:
        env_file = ".env"


settings = Settings()
