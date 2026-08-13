"""Alert API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    vehicle_name: str | None = None
    alert_type: str
    severity: str
    title: str
    message: str
    source: str
    acknowledged: bool
    created_at: datetime
