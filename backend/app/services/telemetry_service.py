"""Process incoming MQTT telemetry and persist to database."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.tracker import Tracker, TrackerStatus
from app.models.vehicle import Vehicle
from app.models.vehicle_position import VehiclePosition
from app.models.vehicle_telemetry import VehicleTelemetry
from app.ml.anomaly_detector import anomaly_detector
from app.schemas.telemetry import EventPayload, TelemetryPayload
from app.security.engine import AlertDraft, security_engine
from app.services.alert_service import AlertService
from app.services.command_service import CommandService
from app.services.trip_service import TripService
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class TelemetryService:
    async def process_telemetry(self, db: AsyncSession, raw_payload: dict) -> bool:
        try:
            payload = TelemetryPayload.model_validate(raw_payload)
        except Exception as exc:
            logger.warning("Payload telemetry invalide: %s — %s", exc, raw_payload)
            return False

        vehicle = await self._get_vehicle_by_device_id(db, payload.device_id)
        if vehicle is None:
            logger.warning("Aucun vehicule associe au device_id=%s", payload.device_id)
            return False

        timestamp = payload.timestamp
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)

        position = VehiclePosition(
            vehicle_id=vehicle.id,
            timestamp=timestamp,
            latitude=payload.latitude,
            longitude=payload.longitude,
            altitude=payload.altitude,
            speed=payload.speed,
            heading=payload.heading,
        )
        telemetry = VehicleTelemetry(
            vehicle_id=vehicle.id,
            timestamp=timestamp,
            ignition=payload.ignition,
            rpm=payload.rpm,
            engine_temperature=payload.engine_temperature,
            battery_voltage=payload.battery_voltage,
            fuel_level=payload.fuel_level,
        )
        db.add(position)
        db.add(telemetry)

        if vehicle.tracker:
            vehicle.tracker.last_seen = datetime.now(UTC)
            vehicle.tracker.status = TrackerStatus.ONLINE

        await db.flush()

        alert_service = AlertService(db)
        trip_service = TripService(db)

        drafts = await security_engine.evaluate_telemetry(db, vehicle, payload)

        for anomaly in anomaly_detector.analyze(vehicle.id, payload):
            drafts.append(
                AlertDraft(
                    alert_type=anomaly.anomaly_type,
                    severity=anomaly.severity,
                    title=anomaly.title,
                    message=anomaly.message,
                    source="ml",
                    metadata=anomaly.metadata,
                )
            )

        if drafts:
            await alert_service.create_from_drafts(vehicle.id, drafts)

        await trip_service.update_from_telemetry(vehicle, payload)

        await ws_manager.broadcast_position(
            vehicle_id=vehicle.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            speed=payload.speed,
            heading=payload.heading,
            timestamp=timestamp,
        )
        logger.info(
            "Telemetry enregistree vehicle_id=%s device=%s speed=%.1f",
            vehicle.id,
            payload.device_id,
            payload.speed,
        )
        return True

    async def process_event(self, db: AsyncSession, raw_payload: dict) -> bool:
        try:
            payload = EventPayload.model_validate(raw_payload)
        except Exception as exc:
            logger.warning("Payload event invalide: %s — %s", exc, raw_payload)
            return False

        vehicle = await self._get_vehicle_by_device_id(db, payload.device_id)
        if vehicle is None:
            return False

        timestamp = payload.timestamp
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)

        if vehicle.tracker:
            vehicle.tracker.last_seen = datetime.now(UTC)
            vehicle.tracker.status = TrackerStatus.ONLINE

        if payload.event_type == "COMMAND_ACK" and payload.metadata:
            command_id = payload.metadata.get("command_id")
            if command_id is not None:
                await CommandService(db).acknowledge_command(
                    int(command_id),
                    {
                        "message": payload.message,
                        "metadata": payload.metadata,
                        "timestamp": timestamp.isoformat(),
                    },
                )
            logger.info("Commande %s accusee reception device=%s", command_id, payload.device_id)
            return True

        drafts = await security_engine.evaluate_event(db, vehicle, payload)
        if drafts:
            await AlertService(db).create_from_drafts(vehicle.id, drafts)

        logger.info(
            "Event recu vehicle_id=%s type=%s message=%s",
            vehicle.id,
            payload.event_type,
            payload.message,
        )
        return True

    async def get_latest_location(self, db: AsyncSession, vehicle: Vehicle) -> dict | None:
        result = await db.execute(
            select(VehiclePosition)
            .where(VehiclePosition.vehicle_id == vehicle.id)
            .order_by(VehiclePosition.timestamp.desc())
            .limit(1)
        )
        position = result.scalar_one_or_none()

        telemetry_result = await db.execute(
            select(VehicleTelemetry)
            .where(VehicleTelemetry.vehicle_id == vehicle.id)
            .order_by(VehicleTelemetry.timestamp.desc())
            .limit(1)
        )
        telemetry = telemetry_result.scalar_one_or_none()

        is_online = False
        if vehicle.tracker and vehicle.tracker.last_seen:
            last_seen = vehicle.tracker.last_seen
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=UTC)
            threshold = datetime.now(UTC).timestamp() - settings.tracker_online_threshold_seconds
            is_online = last_seen.timestamp() >= threshold

        if position is None:
            return {
                "vehicle_id": vehicle.id,
                "latitude": settings.home_latitude,
                "longitude": settings.home_longitude,
                "altitude": 0.0,
                "speed": 0.0,
                "heading": 0.0,
                "ignition": False,
                "battery_voltage": 12.6,
                "engine_temperature": 20.0,
                "rpm": 0,
                "fuel_level": 100.0,
                "timestamp": datetime.now(UTC),
                "is_online": is_online,
            }

        return {
            "vehicle_id": vehicle.id,
            "latitude": position.latitude,
            "longitude": position.longitude,
            "altitude": position.altitude,
            "speed": position.speed,
            "heading": position.heading,
            "ignition": telemetry.ignition if telemetry else None,
            "battery_voltage": telemetry.battery_voltage if telemetry else None,
            "engine_temperature": telemetry.engine_temperature if telemetry else None,
            "rpm": telemetry.rpm if telemetry else None,
            "fuel_level": telemetry.fuel_level if telemetry else None,
            "timestamp": position.timestamp,
            "is_online": is_online,
        }

    async def get_position_history(
        self, db: AsyncSession, vehicle_id: int, *, limit: int = 100
    ) -> list[VehiclePosition]:
        result = await db.execute(
            select(VehiclePosition)
            .where(VehiclePosition.vehicle_id == vehicle_id)
            .order_by(VehiclePosition.timestamp.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _get_vehicle_by_device_id(self, db: AsyncSession, device_id: str) -> Vehicle | None:
        clean_id = device_id.strip()
        # 1. Matching exact (case insensitive)
        result = await db.execute(
            select(Vehicle)
            .join(Tracker, Vehicle.tracker_id == Tracker.id)
            .options(selectinload(Vehicle.tracker))
            .where(func.lower(Tracker.device_id) == func.lower(clean_id))
        )
        vehicle = result.scalar_one_or_none()
        if vehicle is not None:
            return vehicle

        # 2. Matching par IMEI ou partiel
        result = await db.execute(
            select(Vehicle)
            .join(Tracker, Vehicle.tracker_id == Tracker.id)
            .options(selectinload(Vehicle.tracker))
            .where(
                or_(
                    func.lower(Tracker.imei) == func.lower(clean_id),
                    Tracker.device_id.ilike(f"%{clean_id}%"),
                    Tracker.imei.ilike(f"%{clean_id}%"),
                )
            )
        )
        vehicle = result.scalar_one_or_none()
        if vehicle is not None:
            return vehicle

        # 3. Fallback ultime : s'il n'y a qu'un seul véhicule en BDD, router vers lui
        result = await db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.tracker))
            .limit(2)
        )
        vehicles = result.scalars().all()
        if len(vehicles) == 1:
            return vehicles[0]

        return None


telemetry_service = TelemetryService()
