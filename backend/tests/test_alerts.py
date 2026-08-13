"""Alert API tests."""

from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.alert import Alert
from app.models.tracker import Tracker, TrackerStatus
from app.models.user import User
from app.models.vehicle import Vehicle


@pytest.mark.asyncio
async def test_list_alerts(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    user_result = await db_session.execute(select(User).where(User.email == "ali@example.com"))
    user = user_result.scalar_one()
    tracker = Tracker(device_id="SG-ALERT", imei="SIM-A", status=TrackerStatus.ONLINE)
    db_session.add(tracker)
    await db_session.flush()
    vehicle = Vehicle(user_id=user.id, brand="Peugeot", model="308", tracker_id=tracker.id)
    db_session.add(vehicle)
    await db_session.flush()

    db_session.add(
        Alert(
            vehicle_id=vehicle.id,
            alert_type="TOWING_DETECTED",
            severity="critical",
            title="Remorquage",
            message="Test alert",
            created_at=datetime.now(UTC),
        )
    )
    await db_session.flush()

    response = await client.get("/api/v1/alerts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["alert_type"] == "TOWING_DETECTED"


@pytest.mark.asyncio
async def test_acknowledge_alert(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    user_result = await db_session.execute(select(User).where(User.email == "ali@example.com"))
    user = user_result.scalar_one()
    vehicle = Vehicle(user_id=user.id, brand="Peugeot", model="308")
    db_session.add(vehicle)
    await db_session.flush()

    alert = Alert(
        vehicle_id=vehicle.id,
        alert_type="OVERSPEED",
        severity="warning",
        title="Exces",
        message="Test",
        acknowledged=False,
    )
    db_session.add(alert)
    await db_session.flush()

    response = await client.patch(
        f"/api/v1/alerts/{alert.id}/acknowledge",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["acknowledged"] is True
