"""Remote device command service."""

from __future__ import annotations

import json

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.device_command import DeviceCommand
from app.models.user import User
from app.models.vehicle import Vehicle
from app.mqtt.publisher import mqtt_publisher
from app.schemas.command import ALLOWED_COMMANDS, CommandResponse


class CommandService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_command(
        self, vehicle_id: int, user: User, command: str
    ) -> CommandResponse:
        cmd = command.upper()
        if cmd not in ALLOWED_COMMANDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Commande inconnue. Disponibles: {', '.join(sorted(ALLOWED_COMMANDS))}",
            )

        vehicle = await self._get_owned_vehicle(vehicle_id, user.id)
        if vehicle.tracker is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucun tracker associe a ce vehicule",
            )

        record = DeviceCommand(
            vehicle_id=vehicle.id,
            user_id=user.id,
            command=cmd,
            status="pending",
        )
        self.db.add(record)
        await self.db.flush()

        payload = {
            "command": cmd,
            "command_id": record.id,
            "device_id": vehicle.tracker.device_id,
            "issued_at": record.created_at.isoformat(),
        }
        record.payload_json = json.dumps(payload)

        try:
            await mqtt_publisher.publish_command(vehicle.tracker.device_id, payload)
            record.status = "sent"
        except Exception as exc:
            record.status = "failed"
            record.response_json = json.dumps({"error": str(exc)})
            await self.db.flush()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Impossible d'envoyer la commande au tracker",
            ) from exc

        await self.db.flush()
        await self.db.refresh(record)
        return CommandResponse.model_validate(record)

    async def acknowledge_command(self, command_id: int, response: dict) -> None:
        result = await self.db.execute(
            select(DeviceCommand).where(DeviceCommand.id == command_id)
        )
        record = result.scalar_one_or_none()
        if record is None:
            return

        record.status = "acknowledged"
        record.response_json = json.dumps(response)
        await self.db.flush()

    async def list_commands(
        self, vehicle_id: int, user: User, *, limit: int = 20
    ) -> list[CommandResponse]:
        await self._get_owned_vehicle(vehicle_id, user.id)
        result = await self.db.execute(
            select(DeviceCommand)
            .where(DeviceCommand.vehicle_id == vehicle_id)
            .order_by(DeviceCommand.created_at.desc())
            .limit(limit)
        )
        return [CommandResponse.model_validate(c) for c in result.scalars().all()]

    async def _get_owned_vehicle(self, vehicle_id: int, user_id: int) -> Vehicle:
        result = await self.db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.tracker))
            .where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
        )
        vehicle = result.scalar_one_or_none()
        if vehicle is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicule introuvable")
        return vehicle
