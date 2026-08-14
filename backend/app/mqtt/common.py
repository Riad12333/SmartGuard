"""Shared MQTT client options for aiomqtt."""

from __future__ import annotations

import ssl

from app.core.config import settings


def mqtt_client_kwargs() -> dict:
    """Build aiomqtt.Client kwargs from application settings."""
    kwargs: dict = {
        "hostname": settings.mqtt_broker_host,
        "port": settings.mqtt_broker_port,
        "identifier": "smartguard-api-consumer",
        "clean_session": True,
    }

    if settings.mqtt_username:
        kwargs["username"] = settings.mqtt_username
        kwargs["password"] = settings.mqtt_password

    if settings.mqtt_use_tls or settings.mqtt_broker_port == 8883:
        kwargs["tls_context"] = ssl.create_default_context()

    return kwargs
