"""Simulator configuration loaded from project .env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = PROJECT_ROOT / ".env"


class SimulatorSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""

    simulator_device_id: str = "SG-DEVICE-001"
    simulator_imei: str = "SIMULATED-001"
    simulator_publish_interval_seconds: float = 5.0

    # Simulateur 2 — second véhicule (Bab Ezzouar)
    simulator2_device_id: str = "SG-DEVICE-002"
    simulator2_imei: str = "SIMULATED-002"
    simulator2_home_latitude: float = 36.7200
    simulator2_home_longitude: float = 3.1820
    simulator2_home_geofence_radius_m: float = 150.0

    # Geofence "Maison" simulateur 1 (Alger — Hydra)
    home_latitude: float = 36.7525
    home_longitude: float = 3.0420
    home_geofence_radius_m: float = 150.0

    overspeed_limit_kmh: float = 80.0


settings = SimulatorSettings()
