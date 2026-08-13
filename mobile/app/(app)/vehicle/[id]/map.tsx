import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VehicleMap } from "@/components/VehicleMap";
import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import { api } from "@/services/api";
import { connectVehicleWebSocket } from "@/services/websocket";
import { useAuthStore } from "@/store/authStore";
import type { Location, PositionHistoryItem } from "@/types";

function HudChip({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={COLORS.accent} />
      <View>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function FullMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [location, setLocation] = useState<Location | null>(null);
  const [track, setTrack] = useState<PositionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [loc, positions] = await Promise.all([
      api.getVehicleLocation(vehicleId).catch(() => null),
      api.getVehiclePositions(vehicleId, 100).catch(() => []),
    ]);
    setLocation(loc);
    setTrack(positions);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!accessToken) return;
    const ws = connectVehicleWebSocket(vehicleId, accessToken, (pos) => {
      setLocation((prev) => ({
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
      }));
    });
    return () => ws.close();
  }, [accessToken, vehicleId]);

  const HudContent = (
    <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} style={styles.close}>
        <Ionicons name="close" size={24} color={COLORS.text} />
      </Pressable>

      {location ? (
        <View style={styles.hudRight}>
          <Text style={styles.speedBig}>{location.speed?.toFixed(0) ?? 0}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          <VehicleMap location={location} track={track} fullScreen />

          {Platform.OS === "ios" ? (
            <BlurView intensity={50} tint="dark" style={styles.hudBlur}>
              {HudContent}
            </BlurView>
          ) : (
            <View style={styles.hudBlur}>{HudContent}</View>
          )}

          {location ? (
            <View style={[styles.bottomHud, { paddingBottom: insets.bottom + 16 }]}>
              {Platform.OS === "ios" ? (
                <BlurView intensity={50} tint="dark" style={styles.bottomBlur}>
                  <HudChip icon="water-outline" label="Carburant" value={`${location.fuel_level?.toFixed(0) ?? "—"}%`} />
                  <HudChip icon="battery-charging-outline" label="Batterie" value={`${location.battery_voltage?.toFixed(1) ?? "—"} V`} />
                  <HudChip icon="key-outline" label="Moteur" value={location.ignition ? "ON" : "OFF"} />
                </BlurView>
              ) : (
                <View style={styles.bottomBlur}>
                  <HudChip icon="water-outline" label="Carburant" value={`${location.fuel_level?.toFixed(0) ?? "—"}%`} />
                  <HudChip icon="battery-charging-outline" label="Batterie" value={`${location.battery_voltage?.toFixed(1) ?? "—"} V`} />
                  <HudChip icon="key-outline" label="Moteur" value={location.ignition ? "ON" : "OFF"} />
                </View>
              )}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1 },
  hudBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Platform.OS === "android" ? "rgba(6,11,20,0.85)" : undefined,
  },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: 12,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceGlass,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hudRight: { alignItems: "flex-end" },
  speedBig: { color: COLORS.primary, fontSize: 36, fontWeight: "900", lineHeight: 38 },
  speedUnit: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  bottomHud: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
  },
  bottomBlur: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: Platform.OS === "android" ? "rgba(6,11,20,0.9)" : undefined,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipLabel: { color: COLORS.textMuted, fontSize: 10 },
  chipValue: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
});
