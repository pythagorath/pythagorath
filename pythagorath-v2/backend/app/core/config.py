"""Application settings.

Phase 0 uses a fresh local SQLite database. The connection string is read from
the environment (``DATABASE_URL``) so it can later be pointed at PostgreSQL for
production without touching code — never hard-coded anywhere else.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Fresh, separate dev database. Not shared with any previous project.
    database_url: str = "sqlite:///./pythagorath_dev.db"

    # Where uploaded assets (e.g. per-question audio) are stored on the server.
    uploads_dir: str = "uploads"


settings = Settings()
