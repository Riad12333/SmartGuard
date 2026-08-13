"""ML anomaly detector tests."""

from datetime import UTC, datetime

from app.ml.anomaly_detector import anomaly_detector
from app.schemas.telemetry import TelemetryPayload


def test_harsh_acceleration_detected():
    base = TelemetryPayload(
        device_id="SG-ML-001",
        timestamp=datetime.now(UTC),
        latitude=36.72,
        longitude=3.18,
        speed=30,
        ignition=True,
    )
    anomaly_detector.analyze(1, base)
    fast = TelemetryPayload(
        device_id="SG-ML-001",
        timestamp=datetime.now(UTC),
        latitude=36.72,
        longitude=3.18,
        speed=60,
        ignition=True,
    )
    results = anomaly_detector.analyze(1, fast)
    types = [r.anomaly_type for r in results]
    assert "HARSH_ACCELERATION" in types


def test_movement_without_ignition():
    payload = TelemetryPayload(
        device_id="SG-ML-001",
        timestamp=datetime.now(UTC),
        latitude=36.72,
        longitude=3.18,
        speed=25,
        ignition=False,
    )
    results = anomaly_detector.analyze(99, payload)
    assert any(r.anomaly_type == "MOVEMENT_NO_IGNITION" for r in results)
