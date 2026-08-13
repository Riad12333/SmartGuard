"""Telemetry processing tests."""

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracker import Tracker, TrackerStatus
from app.models.user import User
from app.models.vehicle import Vehicle
from sqlalchemy import select

from app.models.vehicle_position import VehiclePosition
from app.core.security import hash_password
from app.services.telemetry_service import telemetry_service


@pytest.mark.asyncio
async def test_process_telemetry_stores_position(db_session: AsyncSession):
    user = User(
        first_name="Test",
        last_name="User",
        email="telemetry@test.com",
        password_hash=hash_password("Password1"),
    )
    tracker = Tracker(device_id="SG-DEVICE-001", imei="SIM-001", status=TrackerStatus.UNKNOWN)
    db_session.add_all([user, tracker])
    await db_session.flush()

    vehicle = Vehicle(user_id=user.id, brand="Peugeot", model="208", tracker_id=tracker.id)
    db_session.add(vehicle)
    await db_session.flush()

    payload = {
        "device_id": "SG-DEVICE-001",
        "timestamp": datetime.now(UTC).isoformat(),
        "latitude": 36.7525,
        "longitude": 3.0420,
        "altitude": 120.0,
        "speed": 61.5,
        "heading": 124.0,
        "ignition": True,
        "battery_voltage": 12.5,
        "engine_temperature": 86.0,
        "rpm": 2300,
        "fuel_level": 63.0,
    }

    ok = await telemetry_service.process_telemetry(db_session, payload)
    assert ok is True

    result = await db_session.execute(
        select(VehiclePosition).where(VehiclePosition.vehicle_id == vehicle.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_process_telemetry_unknown_device(db_session: AsyncSession):
    payload = {
        "device_id": "UNKNOWN-DEVICE",
        "timestamp": datetime.now(UTC).isoformat(),
        "latitude": 36.7525,
        "longitude": 3.0420,
        "speed": 0,
        "ignition": False,
    }
    ok = await telemetry_service.process_telemetry(db_session, payload)
    assert ok is False
