import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { DashboardHero } from "@/components/DashboardHero";
import { FleetMapPreview } from "@/components/FleetMapPreview";
import { HomeHeader } from "@/components/HomeHeader";
import { VehicleCard } from "@/components/VehicleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VehicleCardSkeleton } from "@/components/ui/Skeleton";
import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import { api } from "@/services/api";
import { connectVehicleWebSocket, mergeLivePosition } from "@/services/websocket";
import { useAuthStore } from "@/store/authStore";
import type { Alert, Location, Vehicle } from "@/types";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Record<number, Location | null>>({});
  const [apiAlerts, setApiAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const wsRefs = useRef<WebSocket[]>([]);

  const loadLocations = useCallback(async (vehicleList: Vehicle[]) => {
    const locs: Record<number, Location | null> = {};
    await Promise.all(
      vehicleList.map(async (v) => {
        locs[v.id] = await api.getVehicleLocation(v.id).catch(() => null);
      }),
    );
    setLocations(locs);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [data, alerts] = await Promise.all([
        api.getVehicles(),
        api.getAlerts({ acknowledged: false, limit: 50 }).catch(() => []),
      ]);
      setVehicles(data);
      setApiAlerts(alerts);
      await loadLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLocations]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    wsRefs.current.forEach((ws) => ws.close());
    wsRefs.current = [];

    if (!accessToken || vehicles.length === 0) return;

    wsRefs.current = vehicles.map((vehicle) =>
      connectVehicleWebSocket(vehicle.id, accessToken, (pos) => {
        setLocations((prev) => ({
          ...prev,
          [vehicle.id]: mergeLivePosition(prev[vehicle.id] ?? null, vehicle.id, pos),
        }));
      }),
    );

    return () => {
      wsRefs.current.forEach((ws) => ws.close());
      wsRefs.current = [];
    };
  }, [accessToken, vehicles]);

  useFocusEffect(
    useCallback(() => {
      if (vehicles.length === 0) return;

      const interval = setInterval(() => {
        loadLocations(vehicles).catch(() => undefined);
      }, 15000);

      return () => clearInterval(interval);
    }, [loadLocations, vehicles]),
  );

  const onlineCount = vehicles.filter(
    (v) => locations[v.id]?.is_online ?? v.tracker?.is_online,
  ).length;
  const fleetSpeed = useMemo(() => {
    const speeds = Object.values(locations)
      .filter((loc): loc is Location => loc != null)
      .map((loc) => loc.speed ?? 0);
    if (speeds.length === 0) return 0;
    return Math.round(Math.max(...speeds));
  }, [locations]);
  const alertCount = apiAlerts.filter((a) => a.severity !== "info").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const firstName = user?.first_name ?? "Conducteur";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#152a4a", "#0a1220", COLORS.background]}
        locations={[0, 0.35, 1]}
        style={styles.headerBg}
      />

      <HomeHeader
        greeting={greeting()}
        firstName={firstName}
        avatarUrl={user?.avatar_url}
        avatarCacheKey={user?.updated_at}
        onAddVehicle={() => router.push("/(app)/add-vehicle")}
        onProfile={() => router.push("/(app)/(tabs)/profile")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <>
            <VehicleCardSkeleton />
            <VehicleCardSkeleton />
          </>
        ) : (
          <>
            <DashboardHero
              onlineCount={onlineCount}
              totalCount={vehicles.length}
              alertCount={alertCount}
              avgSpeed={fleetSpeed}
              onAlertsPress={() => router.push("/(app)/(tabs)/alerts")}
            />

            {vehicles.length > 0 && Object.values(locations).some(Boolean) ? (
              <FleetMapPreview vehicles={vehicles} locations={locations} />
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <SectionHeader
              title="Mes véhicules"
              subtitle={`${onlineCount} actif${onlineCount > 1 ? "s" : ""} sur ${vehicles.length}`}
              actionLabel={vehicles.length ? "Ajouter" : undefined}
              onAction={() => router.push("/(app)/add-vehicle")}
            />

            {vehicles.length === 0 ? (
              <Pressable
                style={({ pressed }) => [styles.empty, pressed && { opacity: 0.92 }]}
                onPress={() => router.push("/(app)/add-vehicle")}
              >
                <LinearGradient
                  colors={["rgba(59,130,246,0.15)", "transparent"]}
                  style={styles.emptyGradient}
                />
                <View style={styles.emptyIcon}>
                  <Ionicons name="car-sport" size={36} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>Aucun véhicule</Text>
                <Text style={styles.emptyText}>
                  Connectez votre tracker GPS pour commencer le suivi en temps réel
                </Text>
                <View style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Ajouter un véhicule</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </View>
              </Pressable>
            ) : (
              vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  location={locations[vehicle.id]}
                  onPress={() => router.push(`/(app)/vehicle/${vehicle.id}`)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 4,
    paddingBottom: 100,
  },
  error: {
    color: COLORS.danger,
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    padding: 36,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  emptyGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  emptyCtaText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});
