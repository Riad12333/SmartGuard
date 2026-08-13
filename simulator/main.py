"""Vehicle tracker simulator — publishes telemetry via MQTT."""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import time
from datetime import UTC, datetime

from config import settings
from gps_generator import GPSTrajectoryEngine
from mqtt_client import DryRunPublisher, MQTTPublisher
from profiles import get_profile, list_profiles
from scenarios.base import SCENARIOS, ScenarioContext, list_scenarios
from telemetry import TelemetryState, build_event_payload, build_telemetry_payload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("simulator")

_running = True


def _handle_stop(signum, frame) -> None:
    global _running
    logger.info("Arrêt demandé...")
    _running = False


def create_publisher(*, device_id: str, dry_run: bool, on_command=None):
    if dry_run:
        return DryRunPublisher(device_id=device_id)
    return MQTTPublisher(
        host=settings.mqtt_broker_host,
        port=settings.mqtt_broker_port,
        device_id=device_id,
        username=settings.mqtt_username,
        password=settings.mqtt_password,
        on_command=on_command,
    )


def _make_command_handler(publisher, device_id: str, cmd_state: dict):
    def handle_command(payload: dict) -> None:
        command = str(payload.get("command", "unknown")).upper()
        command_id = payload.get("command_id")
        logger.info("Commande distante recue: %s (id=%s)", command, command_id)

        if command == "REQUEST_LOCATION":
            cmd_state["force_telemetry"] = True
        elif command == "LOCK":
            cmd_state["locked"] = True
        elif command == "UNLOCK":
            cmd_state["locked"] = False
        elif command == "PING":
            pass

        publisher.publish_event(
            build_event_payload(
                device_id=device_id,
                event_type="COMMAND_ACK",
                message=f"Commande {command} executee par le simulateur",
                metadata={
                    "command_id": command_id,
                    "command": command,
                    "locked": cmd_state.get("locked", False),
                },
            )
        )

        if command in ("HONK", "EMERGENCY_ALERT"):
            publisher.publish_event(
                build_event_payload(
                    device_id=device_id,
                    event_type="EMERGENCY_ALERT" if command == "EMERGENCY_ALERT" else "HONK",
                    message="Signal sonore / alerte declenche(e) a distance",
                    metadata={"command_id": command_id, "command": command},
                )
            )

    return handle_command


def run_simulator(
    *,
    scenario_name: str,
    profile_id: str,
    device_id: str | None,
    interval: float,
    dry_run: bool,
    max_ticks: int | None,
) -> None:
    if scenario_name not in SCENARIOS:
        available = ", ".join(SCENARIOS.keys())
        raise SystemExit(f"Scénario inconnu '{scenario_name}'. Disponibles: {available}")

    profile = get_profile(profile_id)
    resolved_device_id = device_id or profile.device_id
    route = profile.route_for_scenario(scenario_name)
    engine = GPSTrajectoryEngine(route, loop=scenario_name in {"normal", "overspeed"})
    scenario = SCENARIOS[scenario_name]()
    ctx = ScenarioContext(engine=engine, telemetry=TelemetryState())
    scenario.on_start(ctx)

    cmd_state: dict = {"force_telemetry": False, "locked": False}
    if dry_run:
        publisher = create_publisher(device_id=resolved_device_id, dry_run=True)
    else:
        publisher = MQTTPublisher(
            host=settings.mqtt_broker_host,
            port=settings.mqtt_broker_port,
            device_id=resolved_device_id,
            username=settings.mqtt_username,
            password=settings.mqtt_password,
        )
        publisher._on_command = _make_command_handler(publisher, resolved_device_id, cmd_state)

    try:
        publisher.connect()
    except Exception as exc:
        if dry_run:
            raise
        logger.error("Impossible de se connecter au broker MQTT: %s", exc)
        logger.error(
            "Installez Mosquitto (https://mosquitto.org/download/) ou utilisez --dry-run"
        )
        raise SystemExit(1) from exc

    publisher.publish_event(
        build_event_payload(
            device_id=resolved_device_id,
            event_type="SIMULATOR_STARTED",
            message=f"Scénario '{scenario_name}' démarré ({profile.label})",
            metadata={
                "scenario": scenario_name,
                "imei": profile.imei,
                "profile": profile_id,
            },
        )
    )

    logger.info(
        "Simulateur démarré — profile=%s device=%s scenario=%s interval=%ss",
        profile_id,
        resolved_device_id,
        scenario_name,
        interval,
    )
    logger.info("Topic télémétrie: vehicles/%s/telemetry", resolved_device_id)

    tick = 0
    last_event: str | None = None

    while _running:
        if max_ticks is not None and tick >= max_ticks:
            break

        target_speed, ignition, timestamp_override = scenario.tick(ctx, interval)
        gps = engine.advance(interval, target_speed)
        ctx.telemetry.update(speed_kmh=gps.speed_kmh, ignition=ignition, delta_seconds=interval)

        timestamp = timestamp_override or datetime.now(UTC)
        payload = build_telemetry_payload(
            device_id=resolved_device_id,
            latitude=gps.latitude,
            longitude=gps.longitude,
            altitude=gps.altitude,
            speed=gps.speed_kmh,
            heading=gps.heading,
            telemetry=ctx.telemetry,
            timestamp=timestamp,
        )
        publisher.publish_telemetry(payload)

        # Événements automatiques selon l'état
        event_type = _detect_event(ctx, scenario_name, ignition, gps.speed_kmh)
        if event_type and event_type != last_event:
            publisher.publish_event(
                build_event_payload(
                    device_id=resolved_device_id,
                    event_type=event_type,
                    message=_event_message(event_type),
                    metadata={
                        "latitude": payload["latitude"],
                        "longitude": payload["longitude"],
                        "speed": payload["speed"],
                    },
                    timestamp=timestamp,
                )
            )
            last_event = event_type

        tick += 1
        logger.info(
            "tick=%d pos=(%.5f, %.5f) speed=%.1f km/h ignition=%s heading=%.0f° [%s]",
            tick,
            gps.latitude,
            gps.longitude,
            gps.speed_kmh,
            ignition,
            gps.heading,
            engine.current_label,
        )
        time.sleep(interval)

    publisher.publish_event(
        build_event_payload(
            device_id=resolved_device_id,
            event_type="SIMULATOR_STOPPED",
            message="Simulateur arrêté",
        )
    )
    publisher.disconnect()
    logger.info("Simulateur arrêté après %d ticks", tick)


def _detect_event(ctx: ScenarioContext, scenario: str, ignition: bool, speed: float) -> str | None:
    if scenario == "theft" and ctx.extra.get("phase") == "escape" and speed > 30:
        return "SUSPICIOUS_ACTIVITY"
    if scenario == "theft" and ctx.extra.get("phase") == "ignition" and ignition:
        return "IGNITION_ON"
    if scenario == "towing" and ctx.extra.get("phase") == "towing" and speed > 10 and not ignition:
        return "TOWING_DETECTED"
    if scenario == "overspeed" and speed > settings.overspeed_limit_kmh:
        return "OVERSPEED"
    if speed > 5 and ignition:
        return "VEHICLE_MOVED"
    return None


def _event_message(event_type: str) -> str:
    messages = {
        "VEHICLE_MOVED": "Le véhicule est en mouvement",
        "IGNITION_ON": "Allumage détecté à une heure inhabituelle",
        "SUSPICIOUS_ACTIVITY": "Activité suspecte — déplacement rapide hors zone",
        "TOWING_DETECTED": "Remorquage possible — mouvement sans allumage",
        "OVERSPEED": f"Excès de vitesse (>{settings.overspeed_limit_kmh} km/h)",
    }
    return messages.get(event_type, event_type)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="SmartGuard Vehicle Simulator — publie de la télémétrie GPS via MQTT",
    )
    parser.add_argument(
        "--profile",
        default="1",
        choices=["1", "2"],
        help="Profil véhicule simulé (1=Clio Hydra, 2=308 Bab Ezzouar)",
    )
    parser.add_argument(
        "--scenario",
        default="normal",
        choices=list(SCENARIOS.keys()),
        help="Scénario de conduite à simuler",
    )
    parser.add_argument(
        "--device-id",
        default=None,
        help="Identifiant tracker (override le profil, ex: SG-DEVICE-002)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=settings.simulator_publish_interval_seconds,
        help="Intervalle entre deux messages (secondes)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Afficher les messages sans MQTT (sans Mosquitto)",
    )
    parser.add_argument(
        "--max-ticks",
        type=int,
        default=None,
        help="Nombre max de messages (utile pour les tests)",
    )
    parser.add_argument(
        "--list-profiles",
        action="store_true",
        help="Lister les profils simulateur disponibles",
    )
    parser.add_argument(
        "--list-scenarios",
        action="store_true",
        help="Lister les scénarios disponibles",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.list_profiles:
        for item in list_profiles():
            print(f"  Profil {item['id']} — {item['label']} ({item['device_id']})")
        return

    if args.list_scenarios:
        for item in list_scenarios():
            print(f"  {item['name']:12} — {item['description']}")
        return

    signal.signal(signal.SIGINT, _handle_stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_stop)

    run_simulator(
        scenario_name=args.scenario,
        profile_id=args.profile,
        device_id=args.device_id,
        interval=args.interval,
        dry_run=args.dry_run,
        max_ticks=args.max_ticks,
    )


if __name__ == "__main__":
    main()
