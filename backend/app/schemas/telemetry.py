"""Pydantic schemas for telemetry and location."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TelemetryPayload(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    timestamp: datetime
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude: float | None = None
    speed: float = Field(ge=0, default=0)
    heading: float | None = Field(default=None, ge=0, le=360)
    ignition: bool = False
    battery_voltage: float | None = None
    engine_temperature: float | None = None
    rpm: int | None = Field(default=None, ge=0)
    fuel_level: float | None = Field(default=None, ge=0, le=100)


class EventPayload(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    timestamp: datetime
    event_type: str = Field(min_length=1, max_length=64)
    message: str = ""
    metadata: dict | None = None


class LocationResponse(BaseModel):
    vehicle_id: int
    latitude: float
    longitude: float
    altitude: float | None
    speed: float | None
    heading: float | None
    ignition: bool | None = None
    battery_voltage: float | None = None
    engine_temperature: float | None = None
    rpm: int | None = None
    fuel_level: float | None = None
    timestamp: datetime
    is_online: bool


class PositionHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float | None
    speed: float | None
    heading: float | None


class WebSocketPositionMessage(BaseModel):
    type: str = "vehicle_position"
    vehicle_id: int
    latitude: float
    longitude: float
    speed: float | None = None
    heading: float | None = None
    timestamp: datetime
