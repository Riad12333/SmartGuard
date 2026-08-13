export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackerSummary {
  id: number;
  device_id: string;
  imei: string | null;
  status: "online" | "offline" | "unknown";
  last_seen: string | null;
  firmware_version: string | null;
  is_online: boolean;
}

export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  registration: string | null;
  vin: string | null;
  tracker: TrackerSummary | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  vehicle_id: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  ignition: boolean | null;
  battery_voltage: number | null;
  engine_temperature: number | null;
  rpm: number | null;
  fuel_level: number | null;
  timestamp: string;
  is_online: boolean;
}

export interface PositionHistoryItem {
  id: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface WebSocketPosition {
  type: "vehicle_position";
  vehicle_id: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

export interface ApiError {
  detail: string | { msg: string }[];
}

export interface Alert {
  id: number;
  vehicle_id: number;
  vehicle_name: string | null;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  source: string;
  acknowledged: boolean;
  created_at: string;
}

export interface Geofence {
  id: number;
  user_id: number;
  vehicle_id: number | null;
  name: string;
  geofence_type: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  is_active: boolean;
  notify_on_exit: boolean;
  notify_on_enter: boolean;
  created_at: string;
}

export interface Trip {
  id: number;
  vehicle_id: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number | null;
  end_longitude: number | null;
  distance_km: number;
  duration_seconds: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  created_at: string;
}

export interface RiskScore {
  vehicle_id: number;
  risk_score: number;
  risk_level: string;
  active_alerts: number;
  computed_at: string;
}

export interface VehicleSecurity {
  vehicle_id: number;
  risk: RiskScore;
  geofences: Geofence[];
  active_alerts: number;
}

export interface DrivingScore {
  id: number;
  vehicle_id: number;
  score: number;
  grade: string;
  harsh_braking_count: number;
  harsh_accel_count: number;
  overspeed_count: number;
  night_trips_count: number;
  distance_km: number;
  computed_at: string;
}

export interface DeviceCommand {
  id: number;
  vehicle_id: number;
  command: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WebSocketAlert {
  type: "vehicle_alert";
  vehicle_id: number;
  alert_id: number;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  timestamp: string;
}
