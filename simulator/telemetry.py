"""Vehicle sensor telemetry simulation."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class TelemetryState:
    ignition: bool = False
    battery_voltage: float = 12.6
    engine_temperature: float = 20.0
    rpm: int = 0
    fuel_level: float = 75.0
    _tick: int = field(default=0, repr=False)

    def update(self, *, speed_kmh: float, ignition: bool, delta_seconds: float) -> None:
        self._tick += 1
        self.ignition = ignition

        if ignition and speed_kmh > 0:
            self.rpm = int(min(4500, max(800, 800 + speed_kmh * 35 + random.uniform(-100, 100))))
            self.engine_temperature = min(110.0, self.engine_temperature + delta_seconds * 0.8)
            self.battery_voltage = round(13.8 + random.uniform(-0.2, 0.2), 1)
            if self._tick % 20 == 0:
                self.fuel_level = max(0.0, self.fuel_level - random.uniform(0.1, 0.4))
        elif ignition and speed_kmh <= 0:
            self.rpm = int(random.uniform(750, 950))
            self.engine_temperature = max(20.0, self.engine_temperature - delta_seconds * 0.2)
            self.battery_voltage = round(12.4 + random.uniform(-0.2, 0.2), 1)
        else:
            self.rpm = 0
            self.engine_temperature = max(15.0, self.engine_temperature - delta_seconds * 0.05)
            self.battery_voltage = round(12.6 + random.uniform(-0.1, 0.1), 1)


def build_telemetry_payload(
    *,
    device_id: str,
    latitude: float,
    longitude: float,
    altitude: float,
    speed: float,
    heading: float,
    telemetry: TelemetryState,
    timestamp: datetime | None = None,
) -> dict:
    ts = timestamp or datetime.now(UTC)
    return {
        "device_id": device_id,
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
        "altitude": round(altitude, 1),
        "speed": round(speed, 1),
        "heading": round(heading, 1),
        "ignition": telemetry.ignition,
        "battery_voltage": telemetry.battery_voltage,
        "engine_temperature": round(telemetry.engine_temperature, 1),
        "rpm": telemetry.rpm,
        "fuel_level": round(telemetry.fuel_level, 1),
    }


def build_event_payload(
    *,
    device_id: str,
    event_type: str,
    message: str,
    metadata: dict | None = None,
    timestamp: datetime | None = None,
) -> dict:
    ts = timestamp or datetime.now(UTC)
    payload: dict = {
        "device_id": device_id,
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event_type": event_type,
        "message": message,
    }
    if metadata:
        payload["metadata"] = metadata
    return payload
