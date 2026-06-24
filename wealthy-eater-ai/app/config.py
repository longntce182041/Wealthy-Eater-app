from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        extra="ignore"
    )

    APP_ENV: str = "development"
    API_PORT: int = 8000
    INTERNAL_SECRET_KEY: str
    LOG_LEVEL: str = "INFO"

settings = Settings()