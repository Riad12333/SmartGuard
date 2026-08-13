"""Vide la base — supprime tous les utilisateurs, vehicules et trackers."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, func, select

from app.core.database import AsyncSessionLocal, engine
from app.models.alert import Alert
from app.models.geofence import Geofence
from app.models.password_reset_token import PasswordResetToken
from app.models.tracker import Tracker
from app.models.trip import Trip
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.vehicle_position import VehiclePosition
from app.models.vehicle_telemetry import VehicleTelemetry


async def count_rows(session, model) -> int:
    result = await session.execute(select(func.count()).select_from(model))
    return int(result.scalar_one())


async def run_clean() -> None:
    print("SmartGuard — nettoyage base de donnees")
    async with AsyncSessionLocal() as session:
        try:
            before = {
                "users": await count_rows(session, User),
                "vehicles": await count_rows(session, Vehicle),
                "trackers": await count_rows(session, Tracker),
            }
            print(f"  Avant : {before['users']} utilisateur(s), {before['vehicles']} vehicule(s), {before['trackers']} tracker(s)")

            if before["users"] == 0 and before["trackers"] == 0:
                print("\nBase deja vide.")
                return

            # Ordre explicite pour PostgreSQL (cascade ORM pas toujours fiable en bulk delete)
            for model in (
                Alert,
                Trip,
                VehiclePosition,
                VehicleTelemetry,
                Geofence,
                DeviceCommand,
                DrivingScore,
                Vehicle,
                PasswordResetToken,
                User,
                Tracker,
            ):
                await session.execute(delete(model))

            await session.commit()

            after_users = await count_rows(session, User)
            after_vehicles = await count_rows(session, Vehicle)
            after_trackers = await count_rows(session, Tracker)

            print(f"  Apres : {after_users} utilisateur(s), {after_vehicles} vehicule(s), {after_trackers} tracker(s)")
            print("\nNettoyage termine.")
            print("Creez votre compte via l'app mobile (Inscription) ou POST /api/v1/auth/register")
            print("Pour lier un simulateur, ajoutez un vehicule avec device_id SG-DEVICE-001 ou SG-DEVICE-002")
        except Exception as exc:
            await session.rollback()
            print(f"\nErreur nettoyage : {exc}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_clean())
