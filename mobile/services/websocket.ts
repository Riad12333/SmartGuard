import { WS_URL } from "@/constants/config";
import type { Location, WebSocketPosition } from "@/types";

export type PositionHandler = (position: WebSocketPosition) => void;

export function mergeLivePosition(
  prev: Location | null,
  vehicleId: number,
  pos: WebSocketPosition,
): Location {
  return {
    vehicle_id: vehicleId,
    latitude: pos.latitude,
    longitude: pos.longitude,
    altitude: prev?.altitude ?? null,
    speed: pos.speed,
    heading: pos.heading,
    ignition: prev?.ignition ?? null,
    battery_voltage: prev?.battery_voltage ?? null,
    engine_temperature: prev?.engine_temperature ?? null,
    rpm: prev?.rpm ?? null,
    fuel_level: prev?.fuel_level ?? null,
    timestamp: pos.timestamp,
    is_online: true,
  };
}

export function connectVehicleWebSocket(
  vehicleId: number,
  token: string,
  onPosition: PositionHandler,
  onError?: (error: Event) => void,
): WebSocket {
  const url = `${WS_URL}/ws/vehicles/${vehicleId}?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WebSocketPosition;
      if (data.type === "vehicle_position") {
        onPosition(data);
      }
    } catch {
      // ignore invalid messages
    }
  };

  ws.onerror = (error) => {
    onError?.(error);
  };

  // Keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 30000);

  ws.onclose = () => {
    clearInterval(pingInterval);
  };

  return ws;
}
