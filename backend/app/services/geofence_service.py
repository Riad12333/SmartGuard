"""Geofence CRUD service."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.geofence import Geofence
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.geofence import GeofenceCreate, GeofenceResponse, GeofenceUpdate


class GeofenceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_geofences(self, user: User, vehicle_id: int | None = None) -> list[GeofenceResponse]:
        query = select(Geofence).where(Geofence.user_id == user.id).order_by(Geofence.created_at.desc())
        if vehicle_id is not None:
            query = query.where(
                (Geofence.vehicle_id == vehicle_id) | (Geofence.vehicle_id.is_(None))
            )
        result = await self.db.execute(query)
        return [GeofenceResponse.model_validate(g) for g in result.scalars().all()]

    async def create_geofence(self, user: User, data: GeofenceCreate) -> GeofenceResponse:
        if data.vehicle_id is not None:
            await self._ensure_vehicle_owner(data.vehicle_id, user.id)

        geofence = Geofence(
            user_id=user.id,
            vehicle_id=data.vehicle_id,
            name=data.name,
            geofence_type=data.geofence_type,
            latitude=data.latitude,
            longitude=data.longitude,
            radius_m=data.radius_m,
            is_active=data.is_active,
            notify_on_exit=data.notify_on_exit,
            notify_on_enter=data.notify_on_enter,
        )
        self.db.add(geofence)
        await self.db.flush()
        await self.db.refresh(geofence)
        return GeofenceResponse.model_validate(geofence)

    async def update_geofence(
        self, geofence_id: int, user: User, data: GeofenceUpdate
    ) -> GeofenceResponse:
        geofence = await self._get_owned(geofence_id, user.id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(geofence, field, value)
        await self.db.flush()
        await self.db.refresh(geofence)
        return GeofenceResponse.model_validate(geofence)

    async def delete_geofence(self, geofence_id: int, user: User) -> None:
        geofence = await self._get_owned(geofence_id, user.id)
        await self.db.delete(geofence)

    async def _get_owned(self, geofence_id: int, user_id: int) -> Geofence:
        result = await self.db.execute(
            select(Geofence).where(Geofence.id == geofence_id, Geofence.user_id == user_id)
        )
        geofence = result.scalar_one_or_none()
        if geofence is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geofence introuvable")
        return geofence

    async def _ensure_vehicle_owner(self, vehicle_id: int, user_id: int) -> None:
        result = await self.db.execute(
            select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicule introuvable")
