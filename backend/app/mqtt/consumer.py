"""Async MQTT consumer for vehicle telemetry and events."""

from __future__ import annotations

import asyncio
import json
import logging

import aiomqtt

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.mqtt.common import mqtt_client_kwargs
from app.services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)

TELEMETRY_TOPIC = "vehicles/+/telemetry"
EVENTS_TOPIC = "vehicles/+/events"


class MQTTConsumer:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._task is not None:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Consumer MQTT demarre")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Consumer MQTT arrete")

    async def _run_loop(self) -> None:
        while self._running:
            try:
                async with aiomqtt.Client(**mqtt_client_kwargs()) as client:
                    await client.subscribe(TELEMETRY_TOPIC)
                    await client.subscribe(EVENTS_TOPIC)
                    logger.info(
                        "Connecte au broker MQTT %s:%s (tls=%s)",
                        settings.mqtt_broker_host,
                        settings.mqtt_broker_port,
                        settings.mqtt_use_tls,
                    )
                    async for message in client.messages:
                        await self._handle_message(message)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Erreur MQTT: %s — reconnexion dans 5s", exc)
                await asyncio.sleep(5)

    async def _handle_message(self, message: aiomqtt.Message) -> None:
        topic = str(message.topic)
        try:
            payload = json.loads(message.payload.decode("utf-8"))
        except json.JSONDecodeError:
            logger.warning("Message MQTT JSON invalide sur %s", topic)
            return

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
