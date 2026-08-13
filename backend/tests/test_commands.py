"""Phase 6 command API tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.tracker import Tracker, TrackerStatus
from app.models.user import User
from app.models.vehicle import Vehicle


@pytest.mark.asyncio
async def test_send_command_requires_tracker(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    user_result = await db_session.execute(select(User).where(User.email == "ali@example.com"))
    user = user_result.scalar_one()
    vehicle = Vehicle(user_id=user.id, brand="Peugeot", model="308")
    db_session.add(vehicle)
    await db_session.flush()

    response = await client.post(
        f"/api/v1/vehicles/{vehicle.id}/commands",
        headers=auth_headers,
        json={"command": "PING"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_send_command_unknown(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    user_result = await db_session.execute(select(User).where(User.email == "ali@example.com"))
    user = user_result.scalar_one()
    tracker = Tracker(device_id="SG-CMD-001", imei="IMEI-CMD", status=TrackerStatus.ONLINE)
    db_session.add(tracker)
    await db_session.flush()
    vehicle = Vehicle(user_id=user.id, brand="Peugeot", model="308", tracker_id=tracker.id)
    db_session.add(vehicle)
    await db_session.flush()

    response = await client.post(
        f"/api/v1/vehicles/{vehicle.id}/commands",
        headers=auth_headers,
        json={"command": "INVALID_CMD"},
    )
    assert response.status_code == 400
