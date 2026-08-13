"""Realistic GPS trajectory generation along waypoint routes."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

EARTH_RADIUS_M = 6_371_000


@dataclass(frozen=True)
class GeoPoint:
    latitude: float
    longitude: float
    altitude: float = 50.0
    label: str = ""


@dataclass
class RouteSegment:
    start: GeoPoint
    end: GeoPoint
    length_m: float = field(init=False)
    bearing_deg: float = field(init=False)

    def __post_init__(self) -> None:
        self.length_m = haversine_m(
            self.start.latitude,
            self.start.longitude,
            self.end.latitude,
            self.end.longitude,
        )
        self.bearing_deg = bearing_deg(
            self.start.latitude,
            self.start.longitude,
            self.end.latitude,
            self.end.longitude,
        )


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lon2 - lon1)
    y = math.sin(d_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def destination_point(lat: float, lon: float, bearing: float, distance_m: float) -> tuple[float, float]:
    angular_distance = distance_m / EARTH_RADIUS_M
    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)
    theta = math.radians(bearing)

    phi2 = math.asin(
        math.sin(phi1) * math.cos(angular_distance)
        + math.cos(phi1) * math.sin(angular_distance) * math.sin(theta)
    )
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(angular_distance) * math.cos(phi1),
        math.cos(angular_distance) - math.sin(phi1) * math.sin(phi2),
    )
    return math.degrees(phi2), math.degrees(lambda2)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


# Trajet réaliste : Maison (Hydra) → Route → Centre-ville Alger → Route → Travail (Blida)
DEFAULT_COMMUTE_ROUTE: list[GeoPoint] = [
    GeoPoint(36.7525, 3.0420, 120.0, "Maison"),
    GeoPoint(36.7350, 3.0250, 110.0, "Route"),
    GeoPoint(36.7762, 3.0588, 95.0, "Centre-ville"),
    GeoPoint(36.7100, 2.9800, 85.0, "Autoroute"),
    GeoPoint(36.6200, 2.9100, 75.0, "Sortie sud"),
    GeoPoint(36.4700, 2.8277, 60.0, "Travail"),
]

# Simulateur 2 — Bab Ezzouar (est d'Alger)
SECOND_COMMUTE_ROUTE: list[GeoPoint] = [
    GeoPoint(36.7200, 3.1820, 80.0, "Maison"),
    GeoPoint(36.7250, 3.1900, 75.0, "Bab Ezzouar"),
    GeoPoint(36.7300, 3.2100, 70.0, "Centre commercial"),
    GeoPoint(36.7350, 3.2350, 65.0, "Route est"),
    GeoPoint(36.7420, 3.2650, 55.0, "Bureau"),
]

# Route rapide pour scénario vol (sortie immédiate de la zone)
THEFT_ESCAPE_ROUTE: list[GeoPoint] = [
    GeoPoint(36.7525, 3.0420, 120.0, "Maison"),
    GeoPoint(36.7600, 3.0550, 115.0, "Fuite nord"),
    GeoPoint(36.7800, 3.0800, 100.0, "Périphérique"),
    GeoPoint(36.8100, 3.1200, 90.0, "Hors zone"),
    GeoPoint(36.8500, 3.1600, 85.0, "Zone industrial"),
]

SECOND_THEFT_ESCAPE_ROUTE: list[GeoPoint] = [
    GeoPoint(36.7200, 3.1820, 80.0, "Maison"),
    GeoPoint(36.7280, 3.2000, 75.0, "Fuite est"),
    GeoPoint(36.7380, 3.2300, 70.0, "Autoroute est"),
    GeoPoint(36.7550, 3.2700, 65.0, "Hors zone"),
    GeoPoint(36.7700, 3.3100, 60.0, "Zone industrial"),
]


@dataclass
class GPSState:
    latitude: float
    longitude: float
    altitude: float
    speed_kmh: float
    heading: float
    segment_index: int = 0
    segment_progress_m: float = 0.0

    @property
    def speed_ms(self) -> float:
        return self.speed_kmh / 3.6


class GPSTrajectoryEngine:
    """Moves a vehicle along a waypoint route at a configurable speed."""

    def __init__(self, waypoints: list[GeoPoint], *, loop: bool = False) -> None:
        if len(waypoints) < 2:
            raise ValueError("A route requires at least 2 waypoints")
        self.waypoints = waypoints
        self.loop = loop
        self.segments = [
            RouteSegment(waypoints[i], waypoints[i + 1]) for i in range(len(waypoints) - 1)
        ]
        self.state = GPSState(
            latitude=waypoints[0].latitude,
            longitude=waypoints[0].longitude,
            altitude=waypoints[0].altitude,
            speed_kmh=0.0,
            heading=self.segments[0].bearing_deg,
        )

    def reset(self, waypoint_index: int = 0) -> None:
        point = self.waypoints[waypoint_index]
        self.state = GPSState(
            latitude=point.latitude,
            longitude=point.longitude,
            altitude=point.altitude,
            speed_kmh=0.0,
            heading=self.segments[min(waypoint_index, len(self.segments) - 1)].bearing_deg,
            segment_index=min(waypoint_index, len(self.segments) - 1),
            segment_progress_m=0.0,
        )

    def advance(self, delta_seconds: float, target_speed_kmh: float) -> GPSState:
        if delta_seconds <= 0:
            self.state.speed_kmh = max(0.0, target_speed_kmh)
            return self.state

        self.state.speed_kmh = max(0.0, target_speed_kmh)
        distance_to_travel = self.state.speed_ms * delta_seconds

        while distance_to_travel > 0 and self.state.segment_index < len(self.segments):
            segment = self.segments[self.state.segment_index]
            remaining_on_segment = max(0.0, segment.length_m - self.state.segment_progress_m)

            if segment.length_m == 0:
                self._advance_segment()
                continue

            if distance_to_travel >= remaining_on_segment:
                distance_to_travel -= remaining_on_segment
                self.state.segment_progress_m = segment.length_m
                self.state.latitude = segment.end.latitude
                self.state.longitude = segment.end.longitude
                self.state.altitude = segment.end.altitude
                self.state.heading = segment.bearing_deg
                if not self._advance_segment():
                    break
            else:
                self.state.segment_progress_m += distance_to_travel
                t = self.state.segment_progress_m / segment.length_m
                self.state.latitude = lerp(segment.start.latitude, segment.end.latitude, t)
                self.state.longitude = lerp(segment.start.longitude, segment.end.longitude, t)
                self.state.altitude = lerp(segment.start.altitude, segment.end.altitude, t)
                self.state.heading = segment.bearing_deg
                distance_to_travel = 0

        return self.state

    def _advance_segment(self) -> bool:
        next_index = self.state.segment_index + 1
        if next_index >= len(self.segments):
            if self.loop:
                self.state.segment_index = 0
                self.state.segment_progress_m = 0.0
                return True
            self.state.speed_kmh = 0.0
            return False

        self.state.segment_index = next_index
        self.state.segment_progress_m = 0.0
        self.state.heading = self.segments[next_index].bearing_deg
        return True

    def distance_from_point_m(self, latitude: float, longitude: float) -> float:
        return haversine_m(self.state.latitude, self.state.longitude, latitude, longitude)

    @property
    def is_moving(self) -> bool:
        return self.state.speed_kmh > 0.5

    @property
    def current_label(self) -> str:
        idx = self.state.segment_index
        return self.segments[idx].start.label or f"segment-{idx}"
