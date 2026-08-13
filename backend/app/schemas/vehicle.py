"""Pydantic schemas for vehicles and trackers."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.tracker import TrackerStatus


class TrackerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    imei: str | None
    status: TrackerStatus
    last_seen: datetime | None
    firmware_version: str | None
    is_online: bool = False


class VehicleCreate(BaseModel):
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int | None = Field(default=None, ge=1900, le=2100)
    color: str | None = Field(default=None, max_length=50)
    registration: str | None = Field(default=None, max_length=32)
    vin: str | None = Field(default=None, max_length=17)
    device_id: str | None = Field(
        default=None,
        max_length=64,
        description="Identifiant du tracker (ex: SG-DEVICE-001)",
    )
    imei: str | None = Field(default=None, max_length=32)


class VehicleUpdate(BaseModel):
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    year: int | None = Field(default=None, ge=1900, le=2100)
    color: str | None = Field(default=None, max_length=50)
    registration: str | None = Field(default=None, max_length=32)
    vin: str | None = Field(default=None, max_length=17)
    device_id: str | None = Field(default=None, max_length=64)
    imei: str | None = Field(default=None, max_length=32)


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    brand: str
    model: str
    year: int | None
    color: str | None
    registration: str | None
    vin: str | None
    tracker: TrackerSummary | None
    created_at: datetime
    updated_at: datetime
