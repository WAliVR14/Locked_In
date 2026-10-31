# backend/app/core/config.py
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Locked_In"
    # Define the current environment: 'development', 'demo', or 'production'
    APP_ENV: Literal["development", "demo", "production"] = "development"

    # By default, it uses a self-managed local database (without depending on Supabase).
    DATABASE_URL: str = "sqlite:///./locked_in.db"

    # JWT Security (Retained intact from Day 3)
    SECRET_KEY: str = "Locked_In_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Optional flag to protect the public demonstration environment
    DEMO_READ_ONLY: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_demo(self) -> bool:
        """Indicate whether the application runs in demonstration mode for recruiters."""
        return self.APP_ENV == "demo"


settings = Settings()