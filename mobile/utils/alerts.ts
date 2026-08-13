import type { Location, PositionHistoryItem, Vehicle } from "@/types";

export type AlertType =
  | "VEHICLE_OFFLINE"
  | "LOW_FUEL"
  | "OVERSPEED"
  | "NO_GPS"
  | "IGNITION_ON"
  | "SECURITY";

export interface AppAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  vehicleId?: number;
  vehicleName?: string;
  timestamp: string;
}

export function buildAlerts(
  vehicles: Vehicle[],
  locations: Record<number, Location | null>,
): AppAlert[] {
  const alerts: AppAlert[] = [];
  const now = new Date().toISOString();

  for (const vehicle of vehicles) {
    const name = `${vehicle.brand} ${vehicle.model}`;
    const loc = locations[vehicle.id];

    if (!vehicle.tracker) {
      alerts.push({
        id: `no-tracker-${vehicle.id}`,
        type: "NO_GPS",
        title: "Pas de tracker",
        message: `${name} n'a pas de tracker associe`,
        severity: "warning",
        vehicleId: vehicle.id,
        vehicleName: name,
        timestamp: now,
      });
      continue;
    }

    if (!vehicle.tracker.is_online) {
      alerts.push({
        id: `offline-${vehicle.id}`,
        type: "VEHICLE_OFFLINE",
        title: "Vehicule hors ligne",
        message: `${name} - tracker deconnecte`,
        severity: "warning",
        vehicleId: vehicle.id,
        vehicleName: name,
        timestamp: vehicle.tracker.last_seen ?? now,
      });
    }

    if (loc) {
      if ((loc.fuel_level ?? 100) < 20) {
        alerts.push({
          id: `fuel-${vehicle.id}`,
          type: "LOW_FUEL",
          title: "Carburant bas",
          message: `${name} - ${loc.fuel_level?.toFixed(0)}% restant`,
          severity: "warning",
          vehicleId: vehicle.id,
          vehicleName: name,
          timestamp: loc.timestamp,
        });
      }
      if ((loc.speed ?? 0) > 80) {
        alerts.push({
          id: `speed-${vehicle.id}`,
          type: "OVERSPEED",
          title: "Excès de vitesse",
          message: `${name} - ${loc.speed?.toFixed(0)} km/h`,
          severity: "critical",
          vehicleId: vehicle.id,
          vehicleName: name,
          timestamp: loc.timestamp,
        });
      }
      if (loc.ignition && !loc.is_online) {
        alerts.push({
          id: `ignition-${vehicle.id}`,
          type: "IGNITION_ON",
          title: "Allumage detecte",
          message: `${name} - moteur en marche`,
          severity: "info",
          vehicleId: vehicle.id,
          vehicleName: name,
          timestamp: loc.timestamp,
        });
      }
    } else if (vehicle.tracker.is_online) {
      alerts.push({
        id: `no-gps-${vehicle.id}`,
        type: "NO_GPS",
        title: "GPS indisponible",
        message: `${name} - en attente de position`,
        severity: "info",
        vehicleId: vehicle.id,
        vehicleName: name,
        timestamp: now,
      });
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export interface TripStats {
  distanceKm: number;
  durationMin: number;
  avgSpeed: number;
  maxSpeed: number;
  pointCount: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeTripStats(positions: PositionHistoryItem[]): TripStats {
  if (positions.length < 2) {
    return { distanceKm: 0, durationMin: 0, avgSpeed: 0, maxSpeed: 0, pointCount: positions.length };
  }

  const sorted = [...positions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let distanceKm = 0;
  let maxSpeed = 0;
  for (let i = 1; i < sorted.length; i++) {
    distanceKm += haversineKm(
      sorted[i - 1].latitude,
      sorted[i - 1].longitude,
      sorted[i].latitude,
      sorted[i].longitude,
    );
    maxSpeed = Math.max(maxSpeed, sorted[i].speed ?? 0);
  }

  const durationMs =
    new Date(sorted[sorted.length - 1].timestamp).getTime() -
    new Date(sorted[0].timestamp).getTime();
  const durationMin = durationMs / 60000;
  const avgSpeed = durationMin > 0 ? distanceKm / (durationMin / 60) : 0;

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round(durationMin),
    avgSpeed: Math.round(avgSpeed),
    maxSpeed: Math.round(maxSpeed),
    pointCount: sorted.length,
  };
}
