"""Security and risk scoring engine — Phase 5."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.alert import Alert
from app.models.geofence import Geofence
from app.models.vehicle import Vehicle
from app.schemas.telemetry import EventPayload, TelemetryPayload
from app.security.geofence_utils import is_inside_geofence

# vehicle_id -> geofence_id -> was_inside
_geofence_state: dict[int, dict[int, bool]] = {}


@dataclass
class AlertDraft:
    alert_type: str
    severity: str
    title: str
    message: str
    source: str = "engine"
    metadata: dict | None = None


EVENT_MAP: dict[str, tuple[str, str, str]] = {
    "TOWING_DETECTED": ("critical", "Remorquage detecte", "Mouvement sans allumage moteur"),
    "IGNITION_ON": ("warning", "Allumage active", "Le moteur a ete demarre"),
    "SUSPICIOUS_ACTIVITY": ("critical", "Activite suspecte", "Comportement anormal detecte"),
    "OVERSPEED": ("warning", "Exces de vitesse", "Vitesse au-dessus de la limite"),
    "VEHICLE_MOVED": ("info", "Vehicule en mouvement", "Deplacement detecte"),
    "GEOFENCE_EXIT": ("critical", "Sortie de zone", "Le vehicule a quitte une zone protegee"),
    "GEOFENCE_ENTER": ("info", "Entree en zone", "Le vehicule est entre dans une zone"),
}


class SecurityEngine:
    async def evaluate_telemetry(
        self,
        db: AsyncSession,
        vehicle: Vehicle,
        payload: TelemetryPayload,
    ) -> list[AlertDraft]:
        drafts: list[AlertDraft] = []

        if payload.speed > settings.overspeed_limit_kmh:
            drafts.append(
                AlertDraft(
                    alert_type="OVERSPEED",
                    severity="warning",
                    title="Exces de vitesse",
                    message=f"Vitesse {payload.speed:.0f} km/h (limite {settings.overspeed_limit_kmh:.0f})",
                    metadata={"speed": payload.speed, "limit": settings.overspeed_limit_kmh},
                )
            )

        if payload.fuel_level is not None and payload.fuel_level < 15:
            drafts.append(
                AlertDraft(
                    alert_type="LOW_FUEL",
                    severity="warning",
                    title="Carburant bas",
                    message=f"Niveau carburant {payload.fuel_level:.0f}%",
                    metadata={"fuel_level": payload.fuel_level},
                )
            )

        if payload.ignition and payload.speed < 2 and datetime.now(UTC).hour < 6:
            drafts.append(
                AlertDraft(
                    alert_type="IGNITION_ON",
                    severity="warning",
                    title="Allumage nocturne",
                    message="Moteur demarre en dehors des heures habituelles",
                    metadata={"hour": datetime.now(UTC).hour},
                )
            )

        geofence_drafts = await self._evaluate_geofences(db, vehicle, payload.latitude, payload.longitude)
        drafts.extend(geofence_drafts)

        return await self._filter_cooldown(db, vehicle.id, drafts)

    async def evaluate_event(self, db: AsyncSession, vehicle: Vehicle, payload: EventPayload) -> list[AlertDraft]:
        mapping = EVENT_MAP.get(payload.event_type)
        if mapping is None:
            severity, title, default_msg = "info", payload.event_type.replace("_", " ").title(), payload.message
        else:
            severity, title, default_msg = mapping

        draft = AlertDraft(
            alert_type=payload.event_type,
            severity=severity,
            title=title,
            message=payload.message or default_msg,
            source="event",
            metadata=payload.metadata,
        )
        filtered = await self._filter_cooldown(db, vehicle.id, [draft])
        return filtered

    async def compute_risk_score(self, db: AsyncSession, vehicle_id: int) -> dict:
        since = datetime.now(UTC) - timedelta(hours=24)
        result = await db.execute(
            select(Alert)
            .where(Alert.vehicle_id == vehicle_id, Alert.created_at >= since, Alert.acknowledged.is_(False))
            .order_by(Alert.created_at.desc())
        )
        alerts = list(result.scalars().all())

        score = 0
        weights = {"critical": 35, "warning": 15, "info": 5}
        for alert in alerts[:10]:
            score += weights.get(alert.severity, 5)

        score = min(100, score)
        if score >= 70:
            level = "critical"
        elif score >= 40:
            level = "warning"
        else:
            level = "normal"

        return {
            "vehicle_id": vehicle_id,
            "risk_score": score,
            "risk_level": level,
            "active_alerts": len(alerts),
            "computed_at": datetime.now(UTC),
        }

    async def _evaluate_geofences(
        self, db: AsyncSession, vehicle: Vehicle, lat: float, lon: float
    ) -> list[AlertDraft]:
        result = await db.execute(
            select(Geofence).where(
                Geofence.is_active.is_(True),
                Geofence.user_id == vehicle.user_id,
                (Geofence.vehicle_id == vehicle.id) | (Geofence.vehicle_id.is_(None)),
            )
        )
        geofences = list(result.scalars().all())
        if vehicle.id not in _geofence_state:
            _geofence_state[vehicle.id] = {}

        drafts: list[AlertDraft] = []
        for gf in geofences:
            inside = is_inside_geofence(lat, lon, gf.latitude, gf.longitude, gf.radius_m)
            was_inside = _geofence_state[vehicle.id].get(gf.id)

            if was_inside is None:
                _geofence_state[vehicle.id][gf.id] = inside
                continue

            if was_inside and not inside and gf.notify_on_exit:
                drafts.append(
                    AlertDraft(
                        alert_type="GEOFENCE_EXIT",
                        severity="critical",
                        title=f"Sortie zone — {gf.name}",
                        message=f"Le vehicule a quitte la zone {gf.name}",
                        metadata={"geofence_id": gf.id, "geofence_name": gf.name},
                    )
                )
            elif not was_inside and inside and gf.notify_on_enter:
                drafts.append(
                    AlertDraft(
                        alert_type="GEOFENCE_ENTER",
                        severity="info",
                        title=f"Entree zone — {gf.name}",
                        message=f"Le vehicule est entre dans {gf.name}",
                        metadata={"geofence_id": gf.id, "geofence_name": gf.name},
                    )
                )

            _geofence_state[vehicle.id][gf.id] = inside

        return drafts

    async def _filter_cooldown(
        self, db: AsyncSession, vehicle_id: int, drafts: list[AlertDraft]
    ) -> list[AlertDraft]:
        if not drafts:
            return []

        cooldown = timedelta(minutes=settings.alert_cooldown_minutes)
        since = datetime.now(UTC) - cooldown
        kept: list[AlertDraft] = []

        for draft in drafts:
            result = await db.execute(
                select(Alert)
                .where(
                    Alert.vehicle_id == vehicle_id,
                    Alert.alert_type == draft.alert_type,
                    Alert.created_at >= since,
                )
                .limit(1)
            )
            if result.scalar_one_or_none() is None:
                kept.append(draft)

        return kept


security_engine = SecurityEngine()


def alert_draft_to_model(vehicle_id: int, draft: AlertDraft) -> Alert:
    return Alert(
        vehicle_id=vehicle_id,
        alert_type=draft.alert_type,
        severity=draft.severity,
        title=draft.title,
        message=draft.message,
        source=draft.source,
        metadata_json=json.dumps(draft.metadata) if draft.metadata else None,
    )
