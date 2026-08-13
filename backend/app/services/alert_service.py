"""Alert persistence and queries."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alert import Alert
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.alert import AlertResponse
from app.security.engine import AlertDraft, alert_draft_to_model
from app.websocket.manager import ws_manager


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_from_drafts(self, vehicle_id: int, drafts: list[AlertDraft]) -> list[Alert]:
        created: list[Alert] = []
        for draft in drafts:
            alert = alert_draft_to_model(vehicle_id, draft)
            self.db.add(alert)
            created.append(alert)

        if created:
            await self.db.flush()
            for alert in created:
                await ws_manager.broadcast_alert(
                    vehicle_id=vehicle_id,
                    alert_id=alert.id,
                    alert_type=alert.alert_type,
                    severity=alert.severity,
                    title=alert.title,
                    message=alert.message,
                    timestamp=alert.created_at,
                )
        return created

    async def list_for_user(
        self,
        user: User,
        *,
        vehicle_id: int | None = None,
        acknowledged: bool | None = None,
        limit: int = 100,
    ) -> list[AlertResponse]:
        query = (
            select(Alert)
            .join(Vehicle, Alert.vehicle_id == Vehicle.id)
            .options(selectinload(Alert.vehicle))
            .where(Vehicle.user_id == user.id)
            .order_by(Alert.created_at.desc())
            .limit(limit)
        )
        if vehicle_id is not None:
            query = query.where(Alert.vehicle_id == vehicle_id)
        if acknowledged is not None:
            query = query.where(Alert.acknowledged.is_(acknowledged))

        result = await self.db.execute(query)
        alerts = list(result.scalars().all())
        return [self._to_response(a) for a in alerts]

    async def acknowledge(self, alert_id: int, user: User) -> AlertResponse:
        alert = await self._get_user_alert(alert_id, user)
        alert.acknowledged = True
        await self.db.flush()
        return self._to_response(alert)

    async def _get_user_alert(self, alert_id: int, user: User) -> Alert:
        result = await self.db.execute(
            select(Alert)
            .join(Vehicle, Alert.vehicle_id == Vehicle.id)
            .options(selectinload(Alert.vehicle))
            .where(Alert.id == alert_id, Vehicle.user_id == user.id)
        )
        alert = result.scalar_one_or_none()
        if alert is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerte introuvable")
        return alert

    def _to_response(self, alert: Alert) -> AlertResponse:
        vehicle = alert.vehicle
        vehicle_name = f"{vehicle.brand} {vehicle.model}" if vehicle else None
        return AlertResponse(
            id=alert.id,
            vehicle_id=alert.vehicle_id,
            vehicle_name=vehicle_name,
            alert_type=alert.alert_type,
            severity=alert.severity,
            title=alert.title,
            message=alert.message,
            source=alert.source,
            acknowledged=alert.acknowledged,
            created_at=alert.created_at,
        )
