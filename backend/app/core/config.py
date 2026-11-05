# backend/app/core/config.py
from typing import Literal, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Locked_In"
    # Define the current environment: 'development', 'demo', or 'production'
    APP_ENV: Literal["development", "demo", "production"] = "development"

    # Database configuration supporting dynamic paths and render persistence
    DATABASE_URL: Optional[str] = None
    DB_PATH: Optional[str] = None

    # CORS Frontend URL (comma-separated origins or '*' wildcard)
    FRONTEND_URL: str = "*"

    # JWT Security (Retained intact from Day 3)
    SECRET_KEY: str = "Locked_In_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Optional flag to protect the public demonstration environment
    DEMO_READ_ONLY: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def db_url(self) -> str:
        """Resolve database URL dynamically with fallback and postgres dialect normalization."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        if self.DB_PATH:
            return f"sqlite:///{self.DB_PATH}"
        return "sqlite:///./locked_in.db"

    @property
    def is_demo(self) -> bool:
        """Indicate whether the application runs in demonstration mode for recruiters."""
        return self.APP_ENV == "demo"


settings = Settings()
