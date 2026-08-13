"""Vehicle and tracker business logic."""

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.tracker import Tracker, TrackerStatus
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import TrackerSummary, VehicleCreate, VehicleResponse, VehicleUpdate


class VehicleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _tracker_is_online(self, tracker: Tracker | None) -> bool:
        if tracker is None or tracker.last_seen is None:
            return False
        threshold = datetime.now(UTC) - timedelta(seconds=settings.tracker_online_threshold_seconds)
        last_seen = tracker.last_seen
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=UTC)
        return last_seen >= threshold

    def _to_tracker_summary(self, tracker: Tracker | None) -> TrackerSummary | None:
        if tracker is None:
            return None
        return TrackerSummary(
            id=tracker.id,
            device_id=tracker.device_id,
            imei=tracker.imei,
            status=tracker.status,
            last_seen=tracker.last_seen,
            firmware_version=tracker.firmware_version,
            is_online=self._tracker_is_online(tracker),
        )

    def _to_vehicle_response(self, vehicle: Vehicle) -> VehicleResponse:
        return VehicleResponse(
            id=vehicle.id,
            brand=vehicle.brand,
            model=vehicle.model,
            year=vehicle.year,
            color=vehicle.color,
            registration=vehicle.registration,
            vin=vehicle.vin,
            tracker=self._to_tracker_summary(vehicle.tracker),
            created_at=vehicle.created_at,
            updated_at=vehicle.updated_at,
        )

    async def _get_vehicle_for_user(self, vehicle_id: int, user_id: int) -> Vehicle:
        result = await self.db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.tracker))
            .where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
        )
        vehicle = result.scalar_one_or_none()
        if vehicle is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Véhicule introuvable")
        return vehicle

    async def _get_or_create_tracker(self, device_id: str, imei: str | None = None) -> Tracker:
        result = await self.db.execute(select(Tracker).where(Tracker.device_id == device_id))
        tracker = result.scalar_one_or_none()
        if tracker is None:
            tracker = Tracker(
                device_id=device_id,
                imei=imei,
                status=TrackerStatus.UNKNOWN,
            )
            self.db.add(tracker)
            await self.db.flush()
            return tracker

        if imei and tracker.imei != imei:
            tracker.imei = imei
            await self.db.flush()
        return tracker

    async def _ensure_tracker_available(self, tracker: Tracker, vehicle_id: int | None = None) -> None:
        result = await self.db.execute(select(Vehicle).where(Vehicle.tracker_id == tracker.id))
        existing = result.scalar_one_or_none()
        if existing and existing.id != vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ce tracker est déjà associé à un autre véhicule",
            )

    async def list_vehicles(self, user: User) -> list[VehicleResponse]:
        result = await self.db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.tracker))
            .where(Vehicle.user_id == user.id)
            .order_by(Vehicle.created_at.desc())
        )
        vehicles = result.scalars().all()
        return [self._to_vehicle_response(vehicle) for vehicle in vehicles]

    async def create_vehicle(self, user: User, data: VehicleCreate) -> VehicleResponse:
        tracker: Tracker | None = None
        if data.device_id:
            tracker = await self._get_or_create_tracker(data.device_id.strip(), data.imei)
            await self._ensure_tracker_available(tracker)

        vehicle = Vehicle(
            user_id=user.id,
            brand=data.brand.strip(),
            model=data.model.strip(),
            year=data.year,
            color=data.color,
            registration=data.registration,
            vin=data.vin,
            tracker_id=tracker.id if tracker else None,
        )
        self.db.add(vehicle)
        await self.db.flush()
        result = await self.db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.tracker))
            .where(Vehicle.id == vehicle.id)
        )
        vehicle = result.scalar_one()
        return self._to_vehicle_response(vehicle)

    async def get_vehicle(self, vehicle_id: int, user: User) -> VehicleResponse:
        vehicle = await self._get_vehicle_for_user(vehicle_id, user.id)
        return self._to_vehicle_response(vehicle)

    async def update_vehicle(self, vehicle_id: int, user: User, data: VehicleUpdate) -> VehicleResponse:
        vehicle = await self._get_vehicle_for_user(vehicle_id, user.id)

        if data.brand is not None:
            vehicle.brand = data.brand.strip()
        if data.model is not None:
            vehicle.model = data.model.strip()
        if data.year is not None:
            vehicle.year = data.year
        if data.color is not None:
            vehicle.color = data.color
        if data.registration is not None:
            vehicle.registration = data.registration
        if data.vin is not None:
            vehicle.vin = data.vin

        if data.device_id is not None:
            if data.device_id == "":
                vehicle.tracker_id = None
            else:
                tracker = await self._get_or_create_tracker(data.device_id.strip(), data.imei)
                await self._ensure_tracker_available(tracker, vehicle.id)
                vehicle.tracker_id = tracker.id
        elif data.imei is not None and vehicle.tracker:
            vehicle.tracker.imei = data.imei

        await self.db.flush()
        vehicle = await self._get_vehicle_for_user(vehicle.id, user.id)
        return self._to_vehicle_response(vehicle)

    async def delete_vehicle(self, vehicle_id: int, user: User) -> None:
        vehicle = await self._get_vehicle_for_user(vehicle_id, user.id)
        await self.db.delete(vehicle)
