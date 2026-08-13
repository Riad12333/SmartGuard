"""Seed SmartGuard — aucune donnee de demo (compte cree via l'app)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import engine


async def run_seed() -> None:
    print("SmartGuard — seed")
    print("  Aucune donnee de demo inseree.")
    print("  Creez votre compte via l'app mobile (Inscription).")
    print("  Simulateurs disponibles : SG-DEVICE-001, SG-DEVICE-002")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seed())
