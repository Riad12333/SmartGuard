"""WebSocket connection manager for live vehicle tracking."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections grouped by vehicle_id."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, vehicle_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(vehicle_id, set()).add(websocket)
        logger.info("WebSocket connecte pour vehicle_id=%s", vehicle_id)

    async def disconnect(self, vehicle_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            if vehicle_id in self._connections:
                self._connections[vehicle_id].discard(websocket)
                if not self._connections[vehicle_id]:
                    del self._connections[vehicle_id]
        logger.info("WebSocket deconnecte pour vehicle_id=%s", vehicle_id)

    async def broadcast_position(
        self,
        *,
        vehicle_id: int,
        latitude: float,
        longitude: float,
        speed: float | None,
        heading: float | None,
        timestamp: datetime,
    ) -> None:
        message = {
            "type": "vehicle_position",
            "vehicle_id": vehicle_id,
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "heading": heading,
            "timestamp": timestamp.isoformat(),
        }
        await self._broadcast(vehicle_id, message)

    async def broadcast_alert(
        self,
        *,
        vehicle_id: int,
        alert_id: int,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        timestamp: datetime,
    ) -> None:
        payload = {
            "type": "vehicle_alert",
            "vehicle_id": vehicle_id,
            "alert_id": alert_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "timestamp": timestamp.isoformat(),
        }
        await self._broadcast(vehicle_id, payload)

    async def _broadcast(self, vehicle_id: int, message: dict) -> None:
        payload = json.dumps(message, ensure_ascii=False)
        async with self._lock:
            sockets = list(self._connections.get(vehicle_id, set()))

        dead: list[WebSocket] = []
        for websocket in sockets:
            try:
                await websocket.send_text(payload)
            except Exception:
                dead.append(websocket)

        if dead:
            async with self._lock:
                for websocket in dead:
                    if vehicle_id in self._connections:
                        self._connections[vehicle_id].discard(websocket)


ws_manager = ConnectionManager()
