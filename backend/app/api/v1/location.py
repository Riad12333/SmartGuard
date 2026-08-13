"""Vehicle location and position history API."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.telemetry import LocationResponse, PositionHistoryItem
from app.services.telemetry_service import telemetry_service
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Location"])


@router.get("/{vehicle_id}/location", response_model=LocationResponse)
async def get_vehicle_location(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LocationResponse:
    vehicle = await VehicleService(db)._get_vehicle_for_user(vehicle_id, current_user.id)
    location = await telemetry_service.get_latest_location(db, vehicle)
    if location is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune position disponible pour ce vehicule",
        )
    return LocationResponse(**location)


@router.get("/{vehicle_id}/positions", response_model=list[PositionHistoryItem])
async def get_vehicle_positions(
    vehicle_id: int,
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PositionHistoryItem]:
    await VehicleService(db)._get_vehicle_for_user(vehicle_id, current_user.id)
    positions = await telemetry_service.get_position_history(db, vehicle_id, limit=limit)
    return [PositionHistoryItem.model_validate(p) for p in positions]
