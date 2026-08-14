"""Robust Paho-MQTT consumer for vehicle telemetry and events."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

import paho.mqtt.client as mqtt

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)

TELEMETRY_TOPIC = "vehicles/+/telemetry"
EVENTS_TOPIC = "vehicles/+/events"


class MQTTConsumer:
    def __init__(self) -> None:
        self.connected = False
        self._loop: asyncio.AbstractEventLoop | None = None
        client_suffix = uuid.uuid4().hex[:6]
        self._client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"smartguard-backend-consumer-{client_suffix}",
            protocol=mqtt.MQTTv311,
            clean_session=True,
            reconnect_on_failure=True,
        )
        if settings.mqtt_username:
            self._client.username_pw_set(settings.mqtt_username, settings.mqtt_password or None)

        if settings.mqtt_use_tls or settings.mqtt_broker_port == 8883:
            self._client.tls_set()

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message
        self._client.reconnect_delay_set(min_delay=1, max_delay=10)

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        try:
            self._client.connect_async(settings.mqtt_broker_host, settings.mqtt_broker_port, keepalive=60)
            self._client.loop_start()
            logger.info("Consumer MQTT demarre vers %s:%s", settings.mqtt_broker_host, settings.mqtt_broker_port)
        except Exception as exc:
            logger.error("Echec demarrage Consumer MQTT: %s", exc)

    async def stop(self) -> None:
        self.connected = False
        try:
            self._client.loop_stop()
            self._client.disconnect()
        except Exception:
            pass
        logger.info("Consumer MQTT arrete")

    def _on_connect(self, client, userdata, flags, reason_code, properties=None) -> None:
        if reason_code == 0:
            self.connected = True
            logger.info("Connecte au broker MQTT %s:%s", settings.mqtt_broker_host, settings.mqtt_broker_port)
            client.subscribe(TELEMETRY_TOPIC, qos=1)
            client.subscribe(EVENTS_TOPIC, qos=1)
        else:
            self.connected = False
            logger.error("Connexion MQTT refusee (rc=%s)", reason_code)

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties=None) -> None:
        self.connected = False
        logger.debug("Deconnecte du broker MQTT (rc=%s)", reason_code)

    def _on_message(self, client, userdata, message) -> None:
        topic = str(message.topic)
        try:
            payload = json.loads(message.payload.decode("utf-8"))
        except Exception as exc:
            logger.warning("Message MQTT JSON invalide sur %s: %s", topic, exc)
            return

        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self._process_message(topic, payload), self._loop)

    async def _process_message(self, topic: str, payload: dict) -> None:
        async with AsyncSessionLocal() as session:
            try:
                if topic.endswith("/telemetry"):
                    await telemetry_service.process_telemetry(session, payload)
                elif topic.endswith("/events"):
                    await telemetry_service.process_event(session, payload)
                await session.commit()
            except Exception as exc:
                await session.rollback()
                logger.exception("Erreur traitement MQTT %s: %s", topic, exc)


mqtt_consumer = MQTTConsumer()
