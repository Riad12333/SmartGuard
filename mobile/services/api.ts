import * as FileSystem from "expo-file-system/legacy";
import { API_URL } from "@/constants/config";
import { useAuthStore } from "@/store/authStore";
import type {
  Alert,
  ApiError,
  Geofence,
  Location,
  PositionHistoryItem,
  TokenResponse,
  Trip,
  User,
  Vehicle,
  VehicleSecurity,
  DrivingScore,
  DeviceCommand,
} from "@/types";

export interface VehicleCreatePayload {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  registration?: string;
  vin?: string;
  device_id?: string;
  imei?: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const { refreshToken, logout, setTokens } = useAuthStore.getState();
      if (!refreshToken) {
        logout();
        return false;
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          logout();
          return false;
        }

        const tokens = (await response.json()) as TokenResponse;
        setTokens(tokens);
        this.setToken(tokens.access_token);
        return true;
      } catch {
        logout();
        return false;
      }
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    allowRefresh = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = data as ApiError | null;
      const message =
        typeof error?.detail === "string"
          ? error.detail
          : error?.detail?.[0]?.msg ?? "Erreur API";

      const isAuthPath =
        path === "/api/v1/auth/login" ||
        path === "/api/v1/auth/register" ||
        path === "/api/v1/auth/refresh";

      if (response.status === 401 && allowRefresh && !isAuthPath) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(path, options, false);
        }
      }

      throw new Error(message);
    }

    return data as T;
  }

  register(payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) {
    return this.request<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  login(email: string, password: string) {
    return this.request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  getMe() {
    return this.request<User>("/api/v1/auth/me");
  }

  updateProfile(data: { first_name?: string; last_name?: string }) {
    return this.request<User>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  private normalizeAvatarMime(mimeType?: string | null) {
    const mime = (mimeType ?? "image/jpeg").toLowerCase();
    if (mime === "image/jpg" || mime === "image/heic" || mime === "image/heif") {
      return "image/jpeg";
    }
    return mime;
  }

  async uploadAvatar(uri: string, mimeType = "image/jpeg") {
    if (!this.accessToken) {
      throw new Error("Session expirée, reconnectez-vous");
    }

    const normalizedMime = this.normalizeAvatarMime(mimeType);

    try {
      const result = await FileSystem.uploadAsync(
        `${API_URL}/api/v1/auth/me/avatar`,
        uri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "file",
          mimeType: normalizedMime,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (result.status < 200 || result.status >= 300) {
        let message = "Échec upload photo";
        try {
          const err = JSON.parse(result.body) as ApiError;
          const detail = err.detail;
          message =
            typeof detail === "string"
              ? detail
              : Array.isArray(detail)
                ? detail.map((d) => d.msg).join(", ")
                : message;
        } catch {
          if (result.body) message = result.body.slice(0, 120);
        }
        throw new Error(message);
      }

      return JSON.parse(result.body) as User;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("Impossible d'envoyer la photo au serveur");
    }
  }

  deleteAvatar() {
    return this.request<User>("/api/v1/auth/me/avatar", { method: "DELETE" });
  }

  changePassword(current_password: string, new_password: string) {
    return this.request<void>("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  forgotPassword(email: string) {
    return this.request<{ message: string; reset_token?: string }>(
      "/api/v1/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  }

  resetPassword(token: string, new_password: string) {
    return this.request<void>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    });
  }

  getVehicles() {
    return this.request<Vehicle[]>("/api/v1/vehicles");
  }

  getVehicle(id: number) {
    return this.request<Vehicle>(`/api/v1/vehicles/${id}`);
  }

  createVehicle(data: VehicleCreatePayload) {
    return this.request<Vehicle>("/api/v1/vehicles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteVehicle(id: number) {
    return this.request<void>(`/api/v1/vehicles/${id}`, { method: "DELETE" });
  }

  getVehicleLocation(id: number) {
    return this.request<Location>(`/api/v1/vehicles/${id}/location`);
  }

  getVehiclePositions(id: number, limit = 50) {
    return this.request<PositionHistoryItem[]>(
      `/api/v1/vehicles/${id}/positions?limit=${limit}`,
    );
  }

  getAlerts(params?: { vehicle_id?: number; acknowledged?: boolean; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.vehicle_id != null) qs.set("vehicle_id", String(params.vehicle_id));
    if (params?.acknowledged != null) qs.set("acknowledged", String(params.acknowledged));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return this.request<Alert[]>(`/api/v1/alerts${query ? `?${query}` : ""}`);
  }

  acknowledgeAlert(id: number) {
    return this.request<Alert>(`/api/v1/alerts/${id}/acknowledge`, { method: "PATCH" });
  }

  getGeofences(vehicleId?: number) {
    const query = vehicleId != null ? `?vehicle_id=${vehicleId}` : "";
    return this.request<Geofence[]>(`/api/v1/geofences${query}`);
  }

  createGeofence(data: {
    name: string;
    geofence_type?: string;
    latitude: number;
    longitude: number;
    radius_m?: number;
    vehicle_id?: number;
    notify_on_exit?: boolean;
    notify_on_enter?: boolean;
  }) {
    return this.request<Geofence>("/api/v1/geofences", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteGeofence(id: number) {
    return this.request<void>(`/api/v1/geofences/${id}`, { method: "DELETE" });
  }

  getVehicleTrips(id: number, limit = 20) {
    return this.request<Trip[]>(`/api/v1/vehicles/${id}/trips?limit=${limit}`);
  }

  getVehicleSecurity(id: number) {
    return this.request<VehicleSecurity>(`/api/v1/vehicles/${id}/security`);
  }

  sendCommand(vehicleId: number, command: string) {
    return this.request<DeviceCommand>(`/api/v1/vehicles/${vehicleId}/commands`, {
      method: "POST",
      body: JSON.stringify({ command }),
    });
  }

  getDrivingScore(vehicleId: number) {
    return this.request<DrivingScore>(`/api/v1/vehicles/${vehicleId}/driving-score`);
  }

  refreshDrivingScore(vehicleId: number) {
    return this.request<DrivingScore>(`/api/v1/vehicles/${vehicleId}/driving-score/refresh`, {
      method: "POST",
    });
  }
}

export const api = new ApiClient();
