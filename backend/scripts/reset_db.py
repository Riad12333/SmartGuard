"""Reset SmartGuard PostgreSQL schema (dev only)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import asyncpg

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402

RESET_SQL = """
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS vehicle_telemetry CASCADE;
DROP TABLE IF EXISTS vehicle_positions CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS trackers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS alembic_version CASCADE;
DROP TYPE IF EXISTS tracker_status CASCADE;
"""


def sync_dsn() -> str:
    url = settings.database_url
    return url.replace("postgresql+asyncpg://", "postgresql://")


async def reset() -> None:
    print(f"Reset schema on {sync_dsn()}")
    conn = await asyncpg.connect(sync_dsn())
    try:
        await conn.execute(RESET_SQL)
        print("Base nettoyee.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(reset())
