"""Geofence API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GeofenceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    geofence_type: str = "custom"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_m: float = Field(default=150, gt=0, le=50000)
    vehicle_id: int | None = None
    is_active: bool = True
    notify_on_exit: bool = True
    notify_on_enter: bool = False


class GeofenceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    geofence_type: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    radius_m: float | None = Field(default=None, gt=0, le=50000)
    is_active: bool | None = None
    notify_on_exit: bool | None = None
    notify_on_enter: bool | None = None


class GeofenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    vehicle_id: int | None
    name: str
    geofence_type: str
    latitude: float
    longitude: float
    radius_m: float
    is_active: bool
    notify_on_exit: bool
    notify_on_enter: bool
    created_at: datetime
