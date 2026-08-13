"""Driving score API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DrivingScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    score: int
    grade: str
    harsh_braking_count: int
    harsh_accel_count: int
    overspeed_count: int
    night_trips_count: int
    distance_km: float
    computed_at: datetime
