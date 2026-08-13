"""Application configuration."""

import os
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = PROJECT_ROOT / ".env"


def normalize_database_url(url: str) -> str:
    """Render/Heroku fournissent postgres:// — SQLAlchemy async exige postgresql+asyncpg://."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        return normalize_database_url(value)

    app_name: str = "SmartGuard API"
    app_version: str = "0.6.0"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # PostgreSQL (defaut) — voir scripts/setup-postgres.ps1
    # SQLite fallback : sqlite+aiosqlite:///./smartguard.db
    database_url: str = (
        "postgresql+asyncpg://smartguard:smartguard_dev_password@localhost:5432/smartguard"
    )
    postgres_user: str = "smartguard"
    postgres_password: str = "smartguard_dev_password"
    postgres_db: str = "smartguard"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    redis_url: str = "redis://localhost:6379/0"
    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883

    secret_key: str = "change-me-to-a-long-random-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    password_reset_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:8081,http://localhost:19006,exp://localhost:8081"

    tracker_online_threshold_seconds: int = 300

    # Phase 5 — securite
    overspeed_limit_kmh: float = 130.0
    alert_cooldown_minutes: int = 5
    home_latitude: float = 36.7525
    home_longitude: float = 3.0420
    home_geofence_radius_m: float = 150.0

    uploads_dir: Path = Path(
        os.getenv("UPLOADS_DIR", str(PROJECT_ROOT / "uploads")),
    )
    avatar_max_bytes: int = 5 * 1024 * 1024

    @property
    def uses_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def port(self) -> int:
        return int(os.getenv("PORT", "8000"))


settings = Settings()
