"""Security engine unit tests."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.geofence import Geofence
from app.models.tracker import Tracker, TrackerStatus
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.telemetry import TelemetryPayload
from app.security.engine import security_engine
from app.security.geofence_utils import haversine_m, is_inside_geofence
from datetime import UTC, datetime


def test_haversine_known_distance():
    # ~1.1 km between two points in Algiers
    d = haversine_m(36.7525, 3.0420, 36.7610, 3.0545)
    assert 1000 < d < 2000


def test_is_inside_geofence():
    assert is_inside_geofence(36.7525, 3.0420, 36.7525, 3.0420, 150) is True
    assert is_inside_geofence(36.7600, 3.0600, 36.7525, 3.0420, 150) is False


@pytest.mark.asyncio
async def test_overspeed_alert(db_session: AsyncSession):
    user = User(
        first_name="Test",
        last_name="User",
        email="overspeed@test.com",
        password_hash=hash_password("Password1"),
    )
    tracker = Tracker(device_id="SG-OVER", imei="SIM-O", status=TrackerStatus.ONLINE)
    db_session.add_all([user, tracker])
    await db_session.flush()

    vehicle = Vehicle(user_id=user.id, brand="Peugeot", model="208", tracker_id=tracker.id)
    db_session.add(vehicle)
    await db_session.flush()

    payload = TelemetryPayload(
        device_id="SG-OVER",
        timestamp=datetime.now(UTC),
        latitude=36.7525,
        longitude=3.0420,
        speed=150,
        ignition=True,
    )
    drafts = await security_engine.evaluate_telemetry(db_session, vehicle, payload)
    types = [d.alert_type for d in drafts]
    assert "OVERSPEED" in types


@pytest.mark.asyncio
async def test_geofence_exit_alert(db_session: AsyncSession):
    user = User(
        first_name="Geo",
        last_name="Test",
        email="geo@test.com",
        password_hash=hash_password("Password1"),
    )
    tracker = Tracker(device_id="SG-GEO", imei="SIM-G", status=TrackerStatus.ONLINE)
    db_session.add_all([user, tracker])
    await db_session.flush()

    vehicle = Vehicle(user_id=user.id, brand="Renault", model="Clio", tracker_id=tracker.id)
    db_session.add(vehicle)
    await db_session.flush()

    gf = Geofence(
        user_id=user.id,
        vehicle_id=vehicle.id,
        name="Maison",
        latitude=36.7525,
        longitude=3.0420,
        radius_m=150,
        notify_on_exit=True,
    )
    db_session.add(gf)
    await db_session.flush()

    inside = TelemetryPayload(
        device_id="SG-GEO",
        timestamp=datetime.now(UTC),
        latitude=36.7525,
        longitude=3.0420,
        speed=0,
        ignition=False,
    )
    await security_engine.evaluate_telemetry(db_session, vehicle, inside)

    outside = TelemetryPayload(
        device_id="SG-GEO",
        timestamp=datetime.now(UTC),
        latitude=36.7600,
        longitude=3.0600,
        speed=30,
        ignition=True,
    )
    drafts = await security_engine.evaluate_telemetry(db_session, vehicle, outside)
    assert any(d.alert_type == "GEOFENCE_EXIT" for d in drafts)
