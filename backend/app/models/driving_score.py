"""Driving behavior score snapshots."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class DrivingScore(Base):
    __tablename__ = "driving_scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, default=100)
    grade: Mapped[str] = mapped_column(String(20), default="excellent")
    harsh_braking_count: Mapped[int] = mapped_column(Integer, default=0)
    harsh_accel_count: Mapped[int] = mapped_column(Integer, default=0)
    overspeed_count: Mapped[int] = mapped_column(Integer, default=0)
    night_trips_count: Mapped[int] = mapped_column(Integer, default=0)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    factors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="driving_scores")
