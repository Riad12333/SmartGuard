"""Trip detection and history."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.telemetry import TelemetryPayload
from app.schemas.trip import TripResponse
from app.security.geofence_utils import haversine_m


class TripService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_from_telemetry(self, vehicle: Vehicle, payload: TelemetryPayload) -> Trip | None:
        active = await self._get_active_trip(vehicle.id)
        moving = payload.speed >= 5 or (payload.ignition and payload.speed > 1)

        if active is None and moving:
            trip = Trip(
                vehicle_id=vehicle.id,
                status="active",
                started_at=payload.timestamp,
                start_latitude=payload.latitude,
                start_longitude=payload.longitude,
                max_speed_kmh=payload.speed,
                avg_speed_kmh=payload.speed,
            )
            self.db.add(trip)
            await self.db.flush()
            return trip

        if active is None:
            return None

        segment_km = haversine_m(
            active.end_latitude or active.start_latitude,
            active.end_longitude or active.start_longitude,
            payload.latitude,
            payload.longitude,
        ) / 1000.0
        active.distance_km += segment_km
        active.end_latitude = payload.latitude
        active.end_longitude = payload.longitude
        active.max_speed_kmh = max(active.max_speed_kmh, payload.speed)

        ts = payload.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC)
        started = active.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=UTC)
        active.duration_seconds = max(0, int((ts - started).total_seconds()))

        elapsed_h = max(active.duration_seconds / 3600, 1 / 3600)
        active.avg_speed_kmh = round(active.distance_km / elapsed_h, 1)

        if not payload.ignition and payload.speed < 2:
            active.status = "completed"
            active.ended_at = ts

        await self.db.flush()
        return active

    async def list_trips(self, vehicle_id: int, *, limit: int = 50) -> list[TripResponse]:
        result = await self.db.execute(
            select(Trip)
            .where(Trip.vehicle_id == vehicle_id)
            .order_by(Trip.started_at.desc())
            .limit(limit)
        )
        return [TripResponse.model_validate(t) for t in result.scalars().all()]

    async def _get_active_trip(self, vehicle_id: int) -> Trip | None:
        result = await self.db.execute(
            select(Trip)
            .where(Trip.vehicle_id == vehicle_id, Trip.status == "active")
            .order_by(Trip.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
