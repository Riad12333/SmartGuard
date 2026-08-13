"""Geofence API routes."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.geofence import GeofenceCreate, GeofenceResponse, GeofenceUpdate
from app.services.geofence_service import GeofenceService

router = APIRouter(prefix="/geofences", tags=["Geofences"])


@router.get("", response_model=list[GeofenceResponse])
async def list_geofences(
    vehicle_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GeofenceResponse]:
    return await GeofenceService(db).list_geofences(current_user, vehicle_id=vehicle_id)


@router.post("", response_model=GeofenceResponse, status_code=status.HTTP_201_CREATED)
async def create_geofence(
    data: GeofenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    return await GeofenceService(db).create_geofence(current_user, data)


@router.patch("/{geofence_id}", response_model=GeofenceResponse)
async def update_geofence(
    geofence_id: int,
    data: GeofenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    return await GeofenceService(db).update_geofence(geofence_id, current_user, data)


@router.delete("/{geofence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_geofence(
    geofence_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await GeofenceService(db).delete_geofence(geofence_id, current_user)
