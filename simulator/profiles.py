"""Simulator device profiles — un profil par véhicule simulé."""

from __future__ import annotations

from dataclasses import dataclass

from config import settings
from gps_generator import (
    DEFAULT_COMMUTE_ROUTE,
    GeoPoint,
    SECOND_COMMUTE_ROUTE,
    SECOND_THEFT_ESCAPE_ROUTE,
    THEFT_ESCAPE_ROUTE,
)


@dataclass(frozen=True)
class SimulatorProfile:
    id: str
    label: str
    device_id: str
    imei: str
    home_latitude: float
    home_longitude: float
    home_geofence_radius_m: float

    def route_for_scenario(self, scenario: str) -> list[GeoPoint]:
        if self.id == "2":
            routes = _ROUTE_BY_SCENARIO_2
        else:
            routes = _ROUTE_BY_SCENARIO_1
        return routes.get(scenario, routes["normal"])


_ROUTE_BY_SCENARIO_1: dict[str, list[GeoPoint]] = {
    "normal": DEFAULT_COMMUTE_ROUTE,
    "stop": DEFAULT_COMMUTE_ROUTE[:1] + DEFAULT_COMMUTE_ROUTE[1:2],
    "overspeed": DEFAULT_COMMUTE_ROUTE,
    "theft": THEFT_ESCAPE_ROUTE,
    "towing": DEFAULT_COMMUTE_ROUTE,
}

_ROUTE_BY_SCENARIO_2: dict[str, list[GeoPoint]] = {
    "normal": SECOND_COMMUTE_ROUTE,
    "stop": SECOND_COMMUTE_ROUTE[:1] + SECOND_COMMUTE_ROUTE[1:2],
    "overspeed": SECOND_COMMUTE_ROUTE,
    "theft": SECOND_THEFT_ESCAPE_ROUTE,
    "towing": SECOND_COMMUTE_ROUTE,
}

PROFILES: dict[str, SimulatorProfile] = {
    "1": SimulatorProfile(
        id="1",
        label="Renault Clio — Hydra",
        device_id=settings.simulator_device_id,
        imei=settings.simulator_imei,
        home_latitude=settings.home_latitude,
        home_longitude=settings.home_longitude,
        home_geofence_radius_m=settings.home_geofence_radius_m,
    ),
    "2": SimulatorProfile(
        id="2",
        label="Peugeot 308 — Bab Ezzouar",
        device_id=settings.simulator2_device_id,
        imei=settings.simulator2_imei,
        home_latitude=settings.simulator2_home_latitude,
        home_longitude=settings.simulator2_home_longitude,
        home_geofence_radius_m=settings.simulator2_home_geofence_radius_m,
    ),
}


def get_profile(profile_id: str) -> SimulatorProfile:
    profile = PROFILES.get(profile_id)
    if profile is None:
        available = ", ".join(PROFILES.keys())
        raise ValueError(f"Profil inconnu '{profile_id}'. Disponibles: {available}")
    return profile


def list_profiles() -> list[dict[str, str]]:
    return [
        {
            "id": p.id,
            "label": p.label,
            "device_id": p.device_id,
            "imei": p.imei,
        }
        for p in PROFILES.values()
    ]
