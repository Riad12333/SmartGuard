"""MQTT publisher for remote device commands."""

from __future__ import annotations

import json
import logging

import aiomqtt

from app.core.config import settings

logger = logging.getLogger(__name__)


class MQTTPublisher:
    async def publish_command(self, device_id: str, payload: dict) -> None:
        topic = f"vehicles/{device_id}/commands"
        message = json.dumps(payload, ensure_ascii=False)
        async with aiomqtt.Client(
            hostname=settings.mqtt_broker_host,
            port=settings.mqtt_broker_port,
        ) as client:
            await client.publish(topic, message, qos=1)
        logger.info("Commande MQTT publiee sur %s: %s", topic, payload.get("command"))


mqtt_publisher = MQTTPublisher()
