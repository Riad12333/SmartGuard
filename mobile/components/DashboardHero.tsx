import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FleetRing } from "@/components/FleetRing";
import { GlassCard } from "@/components/ui/GlassCard";
import { COLORS, FONT, RADIUS, SHADOW } from "@/constants/theme";

interface Props {
  onlineCount: number;
  totalCount: number;
  alertCount: number;
  avgSpeed: number;
  onAlertsPress?: () => void;
}

function Metric({
  icon,
  color,
  value,
  label,
  glow,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string | number;
  label: string;
  glow: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: glow }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function DashboardHero({
  onlineCount,
  totalCount,
  alertCount,
  avgSpeed,
  onAlertsPress,
}: Props) {
  const hasAlerts = alertCount > 0;

  return (
    <GlassCard padding={0} style={styles.hero}>
      <LinearGradient
        colors={["rgba(59,130,246,0.18)", "rgba(6,182,212,0.06)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.glowOrb} />
      <View style={styles.content}>
        <View style={styles.top}>
          <FleetRing online={onlineCount} total={totalCount} size={92} />
          <View style={styles.summary}>
            <Text style={styles.kicker}>État de la flotte</Text>
            <Text style={styles.headline}>
              {onlineCount} sur {totalCount} véhicule{totalCount > 1 ? "s" : ""} actif
              {onlineCount > 1 ? "s" : ""}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Données synchronisées en temps réel</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metrics}>
          <View style={styles.metricCell}>
            <Metric
              icon="car-sport-outline"
              color={COLORS.primary}
              value={`${onlineCount}/${totalCount}`}
              label="En ligne"
              glow={COLORS.primaryGlow}
            />
          </View>
          <View style={styles.metricSep} />
          <Pressable
            style={({ pressed }) => [styles.metricCell, pressed && { opacity: 0.85 }]}
            onPress={onAlertsPress}
            disabled={!onAlertsPress}
          >
            <Metric
              icon="notifications-outline"
              color={hasAlerts ? COLORS.warning : COLORS.success}
              value={alertCount}
              label="Alertes"
              glow={hasAlerts ? COLORS.warningGlow : COLORS.successGlow}
            />
          </Pressable>
          <View style={styles.metricSep} />
          <View style={styles.metricCell}>
            <Metric
              icon="speedometer-outline"
              color={COLORS.accent}
              value={avgSpeed}
              label="Vitesse act."
              glow={COLORS.accentGlow}
            />
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 20,
    ...SHADOW.card,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xl,
  },
  glowOrb: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  content: { padding: 20 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  summary: { flex: 1 },
  kicker: {
    ...FONT.label,
    color: COLORS.accent,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  headline: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 18,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6,11,20,0.45)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 12,
  },
  metricCell: { flex: 1 },
  metricSep: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.borderLight,
  },
  metric: {
    alignItems: "center",
    gap: 4,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
