"""Central configuration loader for SETU-DRR."""

import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Find repository root based on file location
REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"


class Settings(BaseSettings):
    """Application settings read from environment variables and .env file."""

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://setu:setu@localhost:5432/setu",
        description="Main connection string (direct or pooled).",
    )
    DIRECT_DATABASE_URL: str | None = Field(
        default=None,
        description="Direct non-pooled connection string (required for migrations, Martin, and heavy ETL).",
    )
    TEST_DATABASE_URL: str | None = Field(
        default=None,
        description="Dedicated isolated test database connection string.",
    )

    # Runtime & Mode
    DEMO_MODE: bool = Field(
        default=True,
        description="Serve recorded snapshot with zero live external API calls.",
    )
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Application logging level (DEBUG, INFO, WARNING, ERROR).",
    )
    MODEL_VERSION: str = Field(
        default="v1.0.0",
        description="Default machine learning model version tag.",
    )

    # File paths
    DATA_ROOT: Path = Field(
        default=DATA_DIR,
        description="Base directory for raw, interim, and processed data.",
    )

    # API & CORS
    API_PORT: int = Field(default=8000)
    API_HOST: str = Field(default="0.0.0.0")
    ALLOWED_ORIGINS: list[str] = Field(default=["*"])

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_sqlalchemy_url(self, direct: bool = False, async_driver: bool = False) -> str:
        """Returns normalized SQLAlchemy connection URL using psycopg3 driver.
        
        Converts 'postgresql://' or 'postgres://' to 'postgresql+psycopg://' or 'postgresql+asyncpg://'.
        """
        raw_url = (self.DIRECT_DATABASE_URL if direct and self.DIRECT_DATABASE_URL else self.DATABASE_URL)
        if not raw_url:
            raw_url = "postgresql://setu:setu@localhost:5432/setu"

        # Normalize scheme
        driver = "postgresql+psycopg" if not async_driver else "postgresql+asyncpg"
        if raw_url.startswith("postgresql://"):
            return raw_url.replace("postgresql://", f"{driver}://", 1)
        elif raw_url.startswith("postgres://"):
            return raw_url.replace("postgres://", f"{driver}://", 1)
        return raw_url

    def get_direct_psycopg_conninfo(self) -> str:
        """Returns direct psycopg3 connection string (plain postgresql://)."""
        raw_url = self.DIRECT_DATABASE_URL if self.DIRECT_DATABASE_URL else self.DATABASE_URL
        if raw_url.startswith("postgresql+psycopg://"):
            return raw_url.replace("postgresql+psycopg://", "postgresql://", 1)
        if raw_url.startswith("postgresql+asyncpg://"):
            return raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return raw_url


# Global settings singleton
settings = Settings()
