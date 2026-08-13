import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { COLORS, FONT, RADIUS } from "@/constants/theme";
import type { Geofence, Location, VehicleSecurity } from "@/types";

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: "Faible", color: COLORS.success },
  warning: { label: "Modéré", color: COLORS.warning },
  critical: { label: "Élevé", color: COLORS.danger },
};

interface Props {
  security: VehicleSecurity | null;
  location: Location | null;
  speed: number;
  isOnline: boolean;
  isParked: boolean;
  canActivateHome: boolean;
  activatingHome: boolean;
  homeGeofence: Geofence | undefined;
  geofences: Geofence[];
  sendingCommand: string | null;
  onActivateHome: () => void;
  onRemoveHome: () => void;
  onCommand: (cmd: string, label: string) => void;
}

export function VehicleSecurityTab({
  security,
  location,
  speed,
  isOnline,
  isParked,
  canActivateHome,
  activatingHome,
  homeGeofence,
  geofences,
  sendingCommand,
  onActivateHome,
  onRemoveHome,
  onCommand,
}: Props) {
  const riskLevel = security?.risk.risk_level ?? "normal";
  const risk = RISK_LABELS[riskLevel] ?? RISK_LABELS.normal;
  const riskScore = security?.risk.risk_score ?? 0;
  const alertCount = security?.active_alerts ?? 0;

  const commands = [
    { cmd: "REQUEST_LOCATION", icon: "locate-outline" as const, label: "Localiser" },
    { cmd: "PING", icon: "radio-outline" as const, label: "Ping" },
    { cmd: "LOCK", icon: "lock-closed-outline" as const, label: "Verrouiller" },
    { cmd: "UNLOCK", icon: "lock-open-outline" as const, label: "Déverrouiller" },
    { cmd: "HONK", icon: "volume-high-outline" as const, label: "Klaxon" },
    { cmd: "EMERGENCY_ALERT", icon: "alert-circle-outline" as const, label: "Urgence" },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.riskBanner}>
        <View style={styles.riskLeft}>
          <Text style={styles.riskTitle}>Niveau de risque</Text>
          <Text style={[styles.riskLevel, { color: risk.color }]}>{risk.label}</Text>
        </View>
        <View style={styles.riskRight}>
          <Text style={styles.riskScore}>{riskScore}</Text>
          <Text style={styles.riskScoreLabel}>/ 100</Text>
        </View>
        {alertCount > 0 ? (
          <View style={styles.alertChip}>
            <Text style={styles.alertChipText}>
              {alertCount} alerte{alertCount > 1 ? "s" : ""}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.homeCard, homeGeofence && styles.homeCardActive]}>
        <View style={styles.homeTop}>
          <View style={[styles.homeIcon, homeGeofence && styles.homeIconActive]}>
            <Ionicons name="home" size={22} color={homeGeofence ? COLORS.success : COLORS.primary} />
          </View>
          <View style={styles.homeText}>
            <Text style={styles.homeTitle}>Zone domicile</Text>
            <Text style={styles.homeDesc}>
              {homeGeofence
                ? `Rayon ${homeGeofence.radius_m} m · alerte si le véhicule sort`
                : "Définissez votre parking habituel"}
            </Text>
          </View>
        </View>

        {homeGeofence ? (
          <>
            <Text style={styles.coords}>
              {homeGeofence.latitude.toFixed(5)}, {homeGeofence.longitude.toFixed(5)}
            </Text>
            <Button title="Retirer cette zone" variant="secondary" onPress={onRemoveHome} fullWidth />
          </>
        ) : (
          <>
            <HomeStatus location={location} isParked={isParked} speed={speed} />
            <Button
              title={activatingHome ? "Enregistrement…" : "Enregistrer ici"}
              onPress={onActivateHome}
              disabled={!canActivateHome || activatingHome}
              fullWidth
            />
          </>
        )}
      </View>

      {geofences.length > 1 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Autres zones</Text>
          {geofences
            .filter((g) => g.id !== homeGeofence?.id)
            .map((gf) => (
              <View key={gf.id} style={styles.zoneRow}>
                <Text style={styles.zoneName}>{gf.name}</Text>
                <Text style={styles.zoneMeta}>{gf.radius_m} m</Text>
              </View>
            ))}
        </View>
      ) : null}

      <View style={styles.panel}>
        <View style={styles.cmdHead}>
          <Text style={styles.panelTitle}>Commandes</Text>
          {!isOnline ? <Text style={styles.offlineHint}>Tracker hors ligne</Text> : null}
        </View>
        <View style={styles.cmdList}>
          {commands.map((item) => (
            <Pressable
              key={item.cmd}
              style={({ pressed }) => [
                styles.cmdRow,
                pressed && { opacity: 0.75 },
                (!isOnline || sendingCommand === item.cmd) && styles.cmdRowDisabled,
              ]}
              disabled={!isOnline || !!sendingCommand}
              onPress={() => onCommand(item.cmd, item.label)}
            >
              <View style={styles.cmdIcon}>
                {sendingCommand === item.cmd ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.cmdLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function HomeStatus({
  location,
  isParked,
  speed,
}: {
  location: Location | null;
  isParked: boolean;
  speed: number;
}) {
  if (!location) {
    return <Text style={styles.statusLine}>Position GPS indisponible.</Text>;
  }
  if (!isParked) {
    return (
      <Text style={styles.statusLine}>
        Véhicule en mouvement ({speed.toFixed(0)} km/h) — attendez l&apos;arrêt.
      </Text>
    );
  }
  return <Text style={styles.statusLine}>Véhicule à l&apos;arrêt, prêt à enregistrer.</Text>;
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  riskBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 12,
  },
  riskLeft: { flex: 1, minWidth: 120 },
  riskTitle: {
    ...FONT.label,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  riskLevel: {
    fontSize: 22,
    fontWeight: "800",
  },
  riskRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  riskScore: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  riskScoreLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  alertChip: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warningGlow,
  },
  alertChipText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: "600",
  },
  homeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 14,
  },
  homeCardActive: {
    borderColor: "rgba(34,197,94,0.25)",
  },
  homeTop: {
    flexDirection: "row",
    gap: 14,
  },
  homeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  homeIconActive: {
    backgroundColor: COLORS.successGlow,
  },
  homeText: { flex: 1 },
  homeTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  homeDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  coords: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: "monospace",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  statusLine: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  panelTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  zoneName: { color: COLORS.textSecondary, fontSize: 14 },
  zoneMeta: { color: COLORS.textMuted, fontSize: 13 },
  cmdHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  offlineHint: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  cmdList: { marginTop: 4 },
  cmdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cmdRowDisabled: { opacity: 0.45 },
  cmdIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cmdLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
