import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { VehicleCardSkeleton } from "@/components/ui/Skeleton";
import { COLORS, FONT, RADIUS, SPACING } from "@/constants/theme";
import { api } from "@/services/api";
import type { Alert } from "@/types";

const SEVERITY_VARIANT = {
  info: "info" as const,
  warning: "warning" as const,
  critical: "danger" as const,
};

const SEVERITY_COLORS = {
  critical: { bg: COLORS.dangerGlow, border: COLORS.danger, icon: COLORS.danger },
  warning: { bg: COLORS.warningGlow, border: COLORS.warning, icon: COLORS.warning },
  info: { bg: COLORS.primaryGlow, border: COLORS.primary, icon: COLORS.primary },
};

const ALERT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  VEHICLE_OFFLINE: "cloud-offline-outline",
  LOW_FUEL: "water-outline",
  OVERSPEED: "speedometer-outline",
  NO_GPS: "location-outline",
  IGNITION_ON: "key-outline",
  TOWING_DETECTED: "car-outline",
  SUSPICIOUS_ACTIVITY: "warning-outline",
  GEOFENCE_EXIT: "exit-outline",
  GEOFENCE_ENTER: "enter-outline",
  SECURITY: "shield-outline",
};

type Filter = "all" | "critical" | "warning";

function AlertCard({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: (id: number) => void }) {
  const colors =
    SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.info;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/vehicle/${alert.vehicle_id}`)}
      onLongPress={() => !alert.acknowledged && onAcknowledge(alert.id)}
      style={({ pressed }) => [pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.alertCard, { borderLeftColor: colors.border, opacity: alert.acknowledged ? 0.65 : 1 }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
          <Ionicons
            name={ALERT_ICONS[alert.alert_type] ?? "alert-circle-outline"}
            size={22}
            color={colors.icon}
          />
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertTop}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Badge
              label={alert.severity}
              variant={SEVERITY_VARIANT[alert.severity as keyof typeof SEVERITY_VARIANT] ?? "info"}
            />
          </View>
          {alert.vehicle_name ? (
            <Text style={styles.vehicleName}>{alert.vehicle_name}</Text>
          ) : null}
          <Text style={styles.alertMsg}>{alert.message}</Text>
          <Text style={styles.alertTime}>
            {new Date(alert.created_at).toLocaleString("fr-FR")}
            {alert.acknowledged ? " · Lu" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const data = await api.getAlerts({ limit: 100 });
      setAlerts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeAlerts = useMemo(() => alerts.filter((a) => !a.acknowledged), [alerts]);
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;

  const filtered = useMemo(() => {
    const base = activeAlerts;
    if (filter === "all") return base;
    return base.filter((a) => a.severity === filter);
  }, [activeAlerts, filter]);

  const acknowledge = async (id: number) => {
    await api.acknowledgeAlert(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["rgba(239,68,68,0.08)", COLORS.background]}
        style={styles.headerBg}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Centre d'alertes</Text>
        <Text style={styles.subtitle}>
          {activeAlerts.length} notification{activeAlerts.length > 1 ? "s" : ""} active{activeAlerts.length > 1 ? "s" : ""}
        </Text>
      </View>

      <View style={styles.filters}>
        <SegmentedControl
          options={[
            { key: "all" as Filter, label: `Toutes (${activeAlerts.length})` },
            { key: "critical" as Filter, label: `Critiques (${criticalCount})` },
            { key: "warning" as Filter, label: `Avert. (${warningCount})` },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {loading ? (
        <View style={styles.list}>
          <VehicleCardSkeleton />
          <VehicleCardSkeleton />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={COLORS.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <Card style={styles.empty} glow>
              <View style={styles.emptyIcon}>
                <Ionicons name="shield-checkmark" size={48} color={COLORS.success} />
              </View>
              <Text style={styles.emptyTitle}>Tout est normal</Text>
              <Text style={styles.emptyText}>
                Aucune alerte {filter !== "all" ? "dans cette catégorie" : "active"} pour vos véhicules
              </Text>
            </Card>
          ) : (
            filtered.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledge} />
            ))
          )}

          <View style={styles.securityBanner}>
            <LinearGradient
              colors={["rgba(34,197,94,0.15)", "transparent"]}
              style={styles.securityGradient}
            />
            <Ionicons name="shield-checkmark" size={28} color={COLORS.success} />
            <View style={styles.securityText}>
              <Text style={styles.securityTitle}>Protection SmartGuard active</Text>
              <Text style={styles.securityDesc}>
                Geofencing, anti-remorquage et alertes persistées en base de données
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  title: { ...FONT.title, color: COLORS.text, fontSize: 28 },
  subtitle: { color: COLORS.textMuted, marginTop: 4, fontSize: 14 },
  filters: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  alertContent: { flex: 1 },
  alertTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    gap: 8,
  },
  alertTitle: { color: COLORS.text, fontWeight: "700", fontSize: 15, flex: 1 },
  vehicleName: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  alertMsg: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  alertTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  empty: { alignItems: "center", padding: 36 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  emptyText: { color: COLORS.textMuted, marginTop: 8, textAlign: "center" },
  securityBanner: {
    flexDirection: "row",
    gap: 14,
    marginTop: 20,
    padding: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    alignItems: "center",
  },
  securityGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  securityText: { flex: 1 },
  securityTitle: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  securityDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});

