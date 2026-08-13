"""Security and risk score schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.geofence import GeofenceResponse


class RiskScoreResponse(BaseModel):
    vehicle_id: int
    risk_score: int
    risk_level: str
    active_alerts: int
    computed_at: datetime


class VehicleSecurityResponse(BaseModel):
    vehicle_id: int
    risk: RiskScoreResponse
    geofences: list[GeofenceResponse]
    active_alerts: int
