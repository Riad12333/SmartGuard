import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { COLORS, FONT, RADIUS } from "@/constants/theme";
import type { Location, Vehicle } from "@/types";

interface Props {
  vehicle: Vehicle;
  location?: Location | null;
  onPress: () => void;
}

function FuelBar({ level }: { level: number }) {
  const color =
    level < 20 ? COLORS.danger : level < 40 ? COLORS.warning : COLORS.success;
  return (
    <View style={styles.fuelTrack}>
      <View style={[styles.fuelFill, { width: `${Math.min(level, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function VehicleCard({ vehicle, location, onPress }: Props) {
  const isOnline = location?.is_online ?? vehicle.tracker?.is_online ?? false;
  const speed = location?.speed ?? 0;
  const fuel = location?.fuel_level ?? null;
  const accent = isOnline ? COLORS.success : COLORS.textMuted;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <LinearGradient
          colors={["rgba(30,58,95,0.5)", "transparent"]}
          style={styles.gradient}
        />

        <View style={styles.top}>
          <View style={[styles.iconWrap, { borderColor: `${accent}44` }]}>
            <Ionicons name="car-sport" size={26} color={isOnline ? COLORS.primary : COLORS.textMuted} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>
              {vehicle.brand} {vehicle.model}
            </Text>
            {vehicle.registration ? (
              <View style={styles.plateWrap}>
                <Text style={styles.plate}>{vehicle.registration}</Text>
              </View>
            ) : null}
          </View>
          <Badge
            label={isOnline ? "En ligne" : "Hors ligne"}
            variant={isOnline ? "online" : "offline"}
            pulse={isOnline}
          />
        </View>

        {fuel !== null ? (
          <View style={styles.fuelRow}>
            <Ionicons name="water-outline" size={14} color={COLORS.textMuted} />
            <FuelBar level={fuel} />
            <Text style={styles.fuelPct}>{fuel.toFixed(0)}%</Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          <View style={[styles.stat, styles.statPill]}>
            <Text style={[styles.statValue, { color: accent }]}>{speed.toFixed(0)}</Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>
          <View style={[styles.stat, styles.statPill]}>
            <Text style={styles.statValue}>
              {location?.battery_voltage?.toFixed(1) ?? "—"}
            </Text>
            <Text style={styles.statLabel}>Volts</Text>
          </View>
          <View style={[styles.stat, styles.statPill]}>
            <Text
              style={[
                styles.statValue,
                { color: location?.ignition ? COLORS.success : COLORS.textMuted },
              ]}
            >
              {location?.ignition ? "ON" : "OFF"}
            </Text>
            <Text style={styles.statLabel}>Moteur</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.liveRow}>
            {isOnline ? <View style={styles.liveDot} /> : null}
            <Text style={[styles.track, !isOnline && styles.trackMuted]}>
              {isOnline ? "Suivre en direct" : "Hors ligne"}
            </Text>
          </View>
          <LinearGradient
            colors={isOnline ? [COLORS.primary, COLORS.primaryDark] : [COLORS.surfaceHover, COLORS.surface]}
            style={styles.arrowBtn}
          >
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  accentBar: {
    height: 3,
    width: "100%",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  info: { flex: 1 },
  name: {
    ...FONT.heading,
    color: COLORS.text,
    fontSize: 17,
  },
  plateWrap: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  fuelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  fuelTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.backgroundElevated,
    overflow: "hidden",
  },
  fuelFill: {
    height: "100%",
    borderRadius: 2,
  },
  fuelPct: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    width: 32,
    textAlign: "right",
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  stat: { flex: 1, alignItems: "center" },
  statPill: {
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 12,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  track: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  trackMuted: {
    color: COLORS.textMuted,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
