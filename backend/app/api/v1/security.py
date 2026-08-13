"""Vehicle security, trips and risk score routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.security import RiskScoreResponse, VehicleSecurityResponse
from app.schemas.trip import TripResponse
from app.security.engine import security_engine
from app.services.geofence_service import GeofenceService
from app.services.trip_service import TripService
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Security"])


@router.get("/{vehicle_id}/security", response_model=VehicleSecurityResponse)
async def get_vehicle_security(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VehicleSecurityResponse:
    await VehicleService(db).get_vehicle(vehicle_id, current_user)
    risk = await security_engine.compute_risk_score(db, vehicle_id)
    geofences = await GeofenceService(db).list_geofences(current_user, vehicle_id=vehicle_id)
    return VehicleSecurityResponse(
        vehicle_id=vehicle_id,
        risk=RiskScoreResponse(**risk),
        geofences=geofences,
        active_alerts=risk["active_alerts"],
    )


@router.get("/{vehicle_id}/trips", response_model=list[TripResponse])
async def list_vehicle_trips(
    vehicle_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TripResponse]:
    await VehicleService(db).get_vehicle(vehicle_id, current_user)
    return await TripService(db).list_trips(vehicle_id, limit=limit)
