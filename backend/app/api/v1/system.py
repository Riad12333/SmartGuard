"""System utility routes (database management)."""

from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import Alert
from app.models.device_command import DeviceCommand
from app.models.driving_score import DrivingScore
from app.models.geofence import Geofence
from app.models.password_reset_token import PasswordResetToken
from app.models.tracker import Tracker
from app.models.trip import Trip
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.vehicle_position import VehiclePosition
from app.models.vehicle_telemetry import VehicleTelemetry

router = APIRouter(prefix="/system", tags=["System"])


@router.post("/clean-database")
async def clean_database(db: AsyncSession = Depends(get_db)) -> dict:
    """Vide intégralement la base de données (Users, Vehicles, Trackers, Telemetry)."""
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
        await db.execute(delete(model))
    await db.commit()
    return {"message": "Base de donnees videe avec succes."}
