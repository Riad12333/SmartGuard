"""MQTT publisher for vehicle telemetry and events."""

from __future__ import annotations

import json
import logging
import time
import uuid
from threading import Event
from typing import Callable

import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)

MQTT_RC_MESSAGES = {
    mqtt.MQTT_ERR_NO_CONN: "non connecte (autre instance avec le meme device_id ?)",
    mqtt.MQTT_ERR_CONN_LOST: "connexion perdue",
}


class MQTTPublisher:
    """Publishes SmartGuard IoT messages to Mosquitto."""

    def __init__(
        self,
        *,
        host: str,
        port: int,
        device_id: str,
        username: str = "",
        password: str = "",
        use_tls: bool = False,
        on_command: Callable[[dict], None] | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.device_id = device_id
        self._on_command = on_command
        self._connected = Event()
        client_suffix = uuid.uuid4().hex[:8]
        self._client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"smartguard-sim-{device_id}-{client_suffix}",
            protocol=mqtt.MQTTv311,
            clean_session=True,
            reconnect_on_failure=True,
        )
        if username:
            self._client.username_pw_set(username, password or None)
        if use_tls or port == 8883:
            self._client.tls_set()
        self._client.on_connect = self._handle_connect
        self._client.on_disconnect = self._handle_disconnect
        self._client.on_message = self._handle_message
        self._client.reconnect_delay_set(min_delay=1, max_delay=10)

    def _ensure_connected(self) -> bool:
        return self._connected.wait(timeout=5.0)
    @property
    def telemetry_topic(self) -> str:
        return f"vehicles/{self.device_id}/telemetry"

    @property
    def events_topic(self) -> str:
        return f"vehicles/{self.device_id}/events"

    @property
    def commands_topic(self) -> str:
        return f"vehicles/{self.device_id}/commands"

    def connect(self, *, timeout: float = 10.0) -> None:
        logger.info("Connexion MQTT -> %s:%s (device=%s)", self.host, self.port, self.device_id)
        self._client.connect(self.host, self.port, keepalive=120)
        self._client.loop_start()
        if not self._connected.wait(timeout):
            raise RuntimeError(
                f"Connexion MQTT impossible apres {timeout}s. "
                f"Mosquitto demarre ? Une autre instance tourne deja pour {self.device_id} ?"
            )

    def disconnect(self) -> None:
        self._connected.clear()
        self._client.loop_stop()
        self._client.disconnect()

    def publish_telemetry(self, payload: dict) -> None:
        self._publish(self.telemetry_topic, payload)

    def publish_event(self, payload: dict) -> None:
        self._publish(self.events_topic, payload)

    def _publish(self, topic: str, payload: dict, *, retries: int = 5) -> None:
        message = json.dumps(payload, ensure_ascii=False)
        for attempt in range(retries):
            if not self._connected.is_set() and not self._ensure_connected():
                time.sleep(0.5)
                continue

            result = self._client.publish(topic, message, qos=1)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                result.wait_for_publish(timeout=10.0)
                logger.debug("MQTT %s -> %s", topic, message)
                return

            reason = MQTT_RC_MESSAGES.get(result.rc, f"rc={result.rc}")
            if attempt < retries - 1:
                logger.warning(
                    "Publication MQTT echouee (%s) — nouvel essai %d/%d",
                    reason,
                    attempt + 2,
                    retries,
                )
                time.sleep(0.5)
                continue

            raise RuntimeError(
                f"Echec publication MQTT sur {topic} ({reason}). "
                f"Arretez l'autre simulateur pour {self.device_id} (Ctrl+C dans l'autre terminal)."
            )

    def _handle_connect(self, client, userdata, flags, reason_code, properties) -> None:
        if reason_code != 0:
            logger.error("Connexion MQTT refusee: %s", reason_code)
            self._connected.clear()
            return
        self._connected.set()
        logger.info("Connecte au broker MQTT")
        client.subscribe(self.commands_topic, qos=1)
        logger.info("Abonne a %s", self.commands_topic)

    def _handle_disconnect(self, client, userdata, disconnect_flags, reason_code, properties) -> None:
        self._connected.clear()
        if reason_code != 0:
            logger.debug(
                "Deconnecte du broker MQTT (code=%s, flags=%s)",
                reason_code,
                disconnect_flags,
            )

    def _handle_message(self, client, userdata, message) -> None:
        try:
            payload = json.loads(message.payload.decode("utf-8"))
        except json.JSONDecodeError:
            logger.warning("Commande MQTT invalide (JSON): %s", message.payload)
            return
        logger.info("Commande recue sur %s: %s", message.topic, payload)
        if self._on_command:
            self._on_command(payload)


class DryRunPublisher:
    """Prints messages instead of publishing — useful without Mosquitto."""

    def __init__(self, *, device_id: str, **_kwargs) -> None:
        self.device_id = device_id

    def connect(self) -> None:
        logger.info("Mode dry-run — aucune connexion MQTT")

    def disconnect(self) -> None:
        pass

    def publish_telemetry(self, payload: dict) -> None:
        print(f"[TELEMETRY] {json.dumps(payload, ensure_ascii=False)}")

    def publish_event(self, payload: dict) -> None:
        print(f"[EVENT] {json.dumps(payload, ensure_ascii=False)}")
