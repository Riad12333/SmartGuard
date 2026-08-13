"""Tests for GPS trajectory engine."""

import math

from gps_generator import GPSTrajectoryEngine, GeoPoint, haversine_m


def test_haversine_known_distance():
    # ~1 degree latitude ≈ 111 km
    distance = haversine_m(0.0, 0.0, 1.0, 0.0)
    assert 110_000 < distance < 112_000


def test_vehicle_moves_along_route():
    route = [
        GeoPoint(36.7525, 3.0420, 100.0, "A"),
        GeoPoint(36.7600, 3.0500, 100.0, "B"),
        GeoPoint(36.7700, 3.0600, 100.0, "C"),
    ]
    engine = GPSTrajectoryEngine(route)
    start_lat, start_lon = engine.state.latitude, engine.state.longitude

    engine.advance(10, target_speed_kmh=60)
    moved = haversine_m(start_lat, start_lon, engine.state.latitude, engine.state.longitude)
    assert moved > 50
    assert engine.state.speed_kmh == 60
    assert 0 <= engine.state.heading <= 360


def test_stop_scenario_zero_speed():
    route = [
        GeoPoint(36.7525, 3.0420, 100.0, "A"),
        GeoPoint(36.7600, 3.0500, 100.0, "B"),
    ]
    engine = GPSTrajectoryEngine(route)
    engine.advance(5, target_speed_kmh=0)
    assert engine.state.speed_kmh == 0
    assert math.isclose(engine.state.latitude, 36.7525, abs_tol=0.001)
