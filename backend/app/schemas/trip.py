"""Trip API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    status: str
    started_at: datetime
    ended_at: datetime | None
    start_latitude: float
    start_longitude: float
    end_latitude: float | None
    end_longitude: float | None
    distance_km: float
    duration_seconds: int
    max_speed_kmh: float
    avg_speed_kmh: float
    created_at: datetime
