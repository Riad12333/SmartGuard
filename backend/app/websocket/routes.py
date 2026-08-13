"""WebSocket endpoint for live vehicle tracking."""

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token, verify_token_type
from app.models.user import User
from app.models.vehicle import Vehicle
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


async def _authenticate_ws(token: str) -> int | None:
    try:
        payload = decode_token(token)
        user_id = int(verify_token_type(payload, "access"))
    except JWTError:
        return None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user.id if user else None


async def _user_owns_vehicle(user_id: int, vehicle_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
        )
        return result.scalar_one_or_none() is not None


@router.websocket("/ws/vehicles/{vehicle_id}")
async def vehicle_tracking_websocket(
    websocket: WebSocket,
    vehicle_id: int,
    token: str = Query(..., description="JWT access token"),
) -> None:
    user_id = await _authenticate_ws(token)
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if not await _user_owns_vehicle(user_id, vehicle_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(vehicle_id, websocket)
    try:
        while True:
            # Keep connection alive; client may send ping messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(vehicle_id, websocket)
