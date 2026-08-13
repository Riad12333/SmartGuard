"""Lightweight ML anomaly detection from telemetry patterns."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.core.config import settings
from app.schemas.telemetry import TelemetryPayload

# vehicle_id -> last speed sample
_last_speed: dict[int, float] = {}


@dataclass
class AnomalyDraft:
    anomaly_type: str
    severity: str
    title: str
    message: str
    metadata: dict | None = None


class AnomalyDetector:
    """Rule + statistical heuristics (no external ML deps)."""

    def analyze(
        self,
        vehicle_id: int,
        payload: TelemetryPayload,
        *,
        overspeed_limit: float | None = None,
    ) -> list[AnomalyDraft]:
        limit = overspeed_limit or settings.overspeed_limit_kmh
        drafts: list[AnomalyDraft] = []
        prev_speed = _last_speed.get(vehicle_id, payload.speed)
        delta = payload.speed - prev_speed
        _last_speed[vehicle_id] = payload.speed

        if delta >= 25:
            drafts.append(
                AnomalyDraft(
                    anomaly_type="HARSH_ACCELERATION",
                    severity="warning",
                    title="Acceleration brusque",
                    message=f"Acceleration de {delta:.0f} km/h detectee",
                    metadata={"delta_kmh": delta, "speed": payload.speed},
                )
            )

        if delta <= -30:
            drafts.append(
                AnomalyDraft(
                    anomaly_type="HARSH_BRAKING",
                    severity="warning",
                    title="Freinage brusque",
                    message=f"Deceleration de {abs(delta):.0f} km/h detectee",
                    metadata={"delta_kmh": delta, "speed": payload.speed},
                )
            )

        if payload.speed > limit + 20:
            drafts.append(
                AnomalyDraft(
                    anomaly_type="ML_OVERSPEED",
                    severity="critical",
                    title="Comportement a risque",
                    message=f"Vitesse elevee soutenue ({payload.speed:.0f} km/h)",
                    metadata={"speed": payload.speed, "limit": limit},
                )
            )

        hour = payload.timestamp.astimezone(UTC).hour if payload.timestamp.tzinfo else payload.timestamp.hour
        if hour < 5 and payload.speed > 40 and payload.ignition:
            drafts.append(
                AnomalyDraft(
                    anomaly_type="NIGHT_DRIVING",
                    severity="info",
                    title="Conduite nocturne",
                    message="Deplacement a une heure inhabituelle",
                    metadata={"hour": hour, "speed": payload.speed},
                )
            )

        if payload.speed > 15 and not payload.ignition:
            drafts.append(
                AnomalyDraft(
                    anomaly_type="MOVEMENT_NO_IGNITION",
                    severity="critical",
                    title="Mouvement sans allumage",
                    message="Pattern compatible remorquage ou panne capteur",
                    metadata={"speed": payload.speed},
                )
            )

        return drafts


anomaly_detector = AnomalyDetector()
