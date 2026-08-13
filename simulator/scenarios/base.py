"""Driving scenario definitions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime

from gps_generator import DEFAULT_COMMUTE_ROUTE, GPSTrajectoryEngine, GeoPoint, THEFT_ESCAPE_ROUTE
from telemetry import TelemetryState


@dataclass
class ScenarioContext:
    engine: GPSTrajectoryEngine
    telemetry: TelemetryState
    elapsed_seconds: float = 0.0
    step: int = 0
    finished: bool = False
    extra: dict = field(default_factory=dict)


class Scenario(ABC):
    name: str = "base"
    description: str = ""

    @abstractmethod
    def on_start(self, ctx: ScenarioContext) -> None: ...

    @abstractmethod
    def tick(self, ctx: ScenarioContext, delta_seconds: float) -> tuple[float, bool, datetime | None]:
        """Return (target_speed_kmh, ignition, optional_timestamp_override)."""
        ...


class NormalScenario(Scenario):
    name = "normal"
    description = "Trajet quotidien Maison -> Centre-ville -> Travail (50-70 km/h)"

    def on_start(self, ctx: ScenarioContext) -> None:
        ctx.engine.reset(0)
        ctx.telemetry.fuel_level = 80.0

    def tick(self, ctx: ScenarioContext, delta_seconds: float) -> tuple[float, bool, datetime | None]:
        ctx.elapsed_seconds += delta_seconds
        # Accélération progressive au départ, puis vitesse de croisière
        if ctx.elapsed_seconds < 15:
            speed = 20 + ctx.elapsed_seconds * 2.5
        elif ctx.engine.state.segment_index >= len(ctx.engine.segments) - 1:
            speed = max(0.0, 60 - (ctx.elapsed_seconds - 300) * 0.5) if ctx.elapsed_seconds > 300 else 60
        else:
            speed = 55 + (ctx.step % 5) * 2
        ctx.step += 1
        return min(70.0, speed), True, None


class StopScenario(Scenario):
    name = "stop"
    description = "Vehicule a l'arret, moteur eteint"

    def on_start(self, ctx: ScenarioContext) -> None:
        ctx.engine.reset(0)

    def tick(self, ctx: ScenarioContext, delta_seconds: float) -> tuple[float, bool, datetime | None]:
        ctx.elapsed_seconds += delta_seconds
        return 0.0, False, None


class OverspeedScenario(Scenario):
    name = "overspeed"
    description = "Exces de vitesse sur autoroute (> 80 km/h)"

    def on_start(self, ctx: ScenarioContext) -> None:
        ctx.engine.reset(3)  # segment autoroute
        ctx.telemetry.ignition = True

    def tick(self, ctx: ScenarioContext, delta_seconds: float) -> tuple[float, bool, datetime | None]:
        ctx.elapsed_seconds += delta_seconds
        speed = 95 + (ctx.step % 3) * 5
        ctx.step += 1
        return min(115.0, speed), True, None


class TheftScenario(Scenario):
    name = "theft"
    description = "Vol simule a 03:15 — allumage + deplacement hors geofence"

    def on_start(self, ctx: ScenarioContext) -> None:
        ctx.engine.reset(0)
        ctx.extra["phase"] = "idle"
        ctx.extra["phase_elapsed"] = 0.0

    def tick(self, ctx: ScenarioContext, delta_seconds: float) -> tuple[float, bool, datetime | None]:
        ctx.elapsed_seconds += delta_seconds
        ctx.extra["phase_elapsed"] = ctx.extra.get("phase_elapsed", 0.0) + delta_seconds
        phase = ctx.extra["phase"]

        # Simuler une heure nocturne suspecte
        simulated_time = datetime.now(UTC).replace(hour=3, minute=15, second=0, microsecond=0)

        if phase == "idle":
            if ctx.extra["phase_elapsed"] >= 10:
                ctx.extra["phase"] = "ignition"
                ctx.extra["phase_elapsed"] = 0.0
            return 0.0, False, simulated_time

        if phase == "ignition":
            if ctx.extra["phase_elapsed"] >= 5:
                ctx.extra["phase"] = "escape"
                ctx.extra["phase_elapsed"] = 0.0
            return 5.0, True, simulated_time

        # Fuite rapide hors zone
        speed = 75 + (ctx.step % 4) * 3
        ctx.step += 1
        return min(95.0, speed), True, simulated_time


class TowingScenario(Scenario):
    name = "towing"
    description = "Remorquage — moteur eteint mais vehicule en mouvement"

    def on_start(self, ctx: ScenarioContext) -> None:
        ctx.engine.reset(0)
        ctx.extra["phase"] = "parked"
        ctx.extra["phase_elapsed"] = 0.0

    def tick(self, ctx: ScenarioContext, delta_seconds: float) -> tuple[float, bool, datetime | None]:
        ctx.elapsed_seconds += delta_seconds
        ctx.extra["phase_elapsed"] = ctx.extra.get("phase_elapsed", 0.0) + delta_seconds

        if ctx.extra["phase"] == "parked":
            if ctx.extra["phase_elapsed"] >= 15:
                ctx.extra["phase"] = "towing"
                ctx.extra["phase_elapsed"] = 0.0
            return 0.0, False, None

        # Remorquage : 15-35 km/h, pas d'allumage
        speed = 20 + (ctx.step % 5) * 3
        ctx.step += 1
        return min(35.0, speed), False, None


SCENARIOS: dict[str, type[Scenario]] = {
    NormalScenario.name: NormalScenario,
    StopScenario.name: StopScenario,
    OverspeedScenario.name: OverspeedScenario,
    TheftScenario.name: TheftScenario,
    TowingScenario.name: TowingScenario,
}

ROUTE_BY_SCENARIO: dict[str, list[GeoPoint]] = {
    "normal": DEFAULT_COMMUTE_ROUTE,
    "stop": DEFAULT_COMMUTE_ROUTE[:1] + DEFAULT_COMMUTE_ROUTE[1:2],
    "overspeed": DEFAULT_COMMUTE_ROUTE,
    "theft": THEFT_ESCAPE_ROUTE,
    "towing": DEFAULT_COMMUTE_ROUTE,
}


def list_scenarios() -> list[dict[str, str]]:
    return [
        {"name": cls.name, "description": cls.description}
        for cls in SCENARIOS.values()
    ]
