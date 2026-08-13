"""Vehicle model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.device_command import DeviceCommand
    from app.models.driving_score import DrivingScore
    from app.models.geofence import Geofence
    from app.models.tracker import Tracker
    from app.models.trip import Trip
    from app.models.user import User
    from app.models.vehicle_position import VehiclePosition
    from app.models.vehicle_telemetry import VehicleTelemetry


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    registration: Mapped[str | None] = mapped_column(String(32), nullable=True)
    vin: Mapped[str | None] = mapped_column(String(17), nullable=True)
    tracker_id: Mapped[int | None] = mapped_column(
        ForeignKey("trackers.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship("User", back_populates="vehicles")
    tracker: Mapped["Tracker | None"] = relationship("Tracker", back_populates="vehicle")
    positions: Mapped[list["VehiclePosition"]] = relationship(
        "VehiclePosition", back_populates="vehicle", cascade="all, delete-orphan"
    )
    telemetry_records: Mapped[list["VehicleTelemetry"]] = relationship(
        "VehicleTelemetry", back_populates="vehicle", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(
        "Alert", back_populates="vehicle", cascade="all, delete-orphan"
    )
    trips: Mapped[list["Trip"]] = relationship(
        "Trip", back_populates="vehicle", cascade="all, delete-orphan"
    )
    geofences: Mapped[list["Geofence"]] = relationship(
        "Geofence", back_populates="vehicle", cascade="all, delete-orphan"
    )
    device_commands: Mapped[list["DeviceCommand"]] = relationship(
        "DeviceCommand", back_populates="vehicle", cascade="all, delete-orphan"
    )
    driving_scores: Mapped[list["DrivingScore"]] = relationship(
        "DrivingScore", back_populates="vehicle", cascade="all, delete-orphan"
    )
