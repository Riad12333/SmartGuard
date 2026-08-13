"""User account model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.device_command import DeviceCommand
    from app.models.geofence import Geofence
    from app.models.password_reset_token import PasswordResetToken
    from app.models.vehicle import Vehicle


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    avatar_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    vehicles: Mapped[list["Vehicle"]] = relationship(
        "Vehicle", back_populates="owner", cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    geofences: Mapped[list["Geofence"]] = relationship(
        "Geofence", back_populates="owner", cascade="all, delete-orphan"
    )
    device_commands: Mapped[list["DeviceCommand"]] = relationship(
        "DeviceCommand", back_populates="user", cascade="all, delete-orphan"
    )
