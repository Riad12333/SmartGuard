import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SpeedGauge } from "@/components/SpeedGauge";
import { StatCard } from "@/components/StatCard";
import { VehicleMap } from "@/components/VehicleMap";
import { VehicleSecurityTab } from "@/components/vehicle/VehicleSecurityTab";
import { VehicleStatsTab } from "@/components/vehicle/VehicleStatsTab";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { COLORS, FONT, RADIUS, SPACING } from "@/constants/theme";
import { api } from "@/services/api";
import { connectVehicleWebSocket, mergeLivePosition } from "@/services/websocket";
import { useAuthStore } from "@/store/authStore";
import type { DrivingScore, Location, PositionHistoryItem, Trip, Vehicle, VehicleSecurity } from "@/types";

type Tab = "live" | "stats" | "security";

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [track, setTrack] = useState<PositionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [security, setSecurity] = useState<VehicleSecurity | null>(null);
  const [activatingHome, setActivatingHome] = useState(false);
  const [drivingScore, setDrivingScore] = useState<DrivingScore | null>(null);
  const [sendingCommand, setSendingCommand] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const statsRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HOME_RADIUS_M = 150;
  const PARKED_SPEED_KMH = 5;
  const STATS_REFRESH_MS = 10_000;

  const loadStats = useCallback(async () => {
    const [tripsData, scoreData] = await Promise.all([
      api.getVehicleTrips(vehicleId).catch(() => []),
      api.getDrivingScore(vehicleId).catch(() => null),
    ]);
    setTrips(tripsData);
    if (scoreData) setDrivingScore(scoreData);
  }, [vehicleId]);

  const scheduleStatsRefresh = useCallback(() => {
    if (statsRefreshTimer.current) clearTimeout(statsRefreshTimer.current);
    statsRefreshTimer.current = setTimeout(() => {
      statsRefreshTimer.current = null;
      loadStats().catch(() => undefined);
    }, STATS_REFRESH_MS);
  }, [loadStats]);

  const loadData = useCallback(async () => {
    try {
      const [vehicleData, locationData, trackData, securityData] = await Promise.all([
        api.getVehicle(vehicleId),
        api.getVehicleLocation(vehicleId).catch(() => null),
        api.getVehiclePositions(vehicleId, 100).catch(() => []),
        api.getVehicleSecurity(vehicleId).catch(() => null),
      ]);
      setVehicle(vehicleData);
      setLocation(locationData);
      setTrack(trackData);
      setSecurity(securityData);
      await loadStats();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId, loadStats]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab !== "stats") return;
    loadStats().catch(() => undefined);
    const interval = setInterval(() => {
      loadStats().catch(() => undefined);
    }, STATS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [tab, loadStats]);

  useEffect(() => {
    if (!accessToken) return;
    const ws = connectVehicleWebSocket(vehicleId, accessToken, (pos) => {
      setLive(true);
      setLocation((prev) => mergeLivePosition(prev, vehicleId, pos));
      scheduleStatsRefresh();
    });
    wsRef.current = ws;
    return () => {
      if (statsRefreshTimer.current) clearTimeout(statsRefreshTimer.current);
      ws.close();
    };
  }, [accessToken, vehicleId, scheduleStatsRefresh]);

  const geofences = security?.geofences ?? [];
  const homeGeofence = geofences.find(
    (g) => g.geofence_type === "home" || g.name.toLowerCase() === "maison",
  );
  const isOnline = location?.is_online ?? vehicle?.tracker?.is_online ?? false;
  const speed = location?.speed ?? 0;
  const isParked = location != null && speed <= PARKED_SPEED_KMH;
  const canActivateHome = isParked && !homeGeofence;

  const activateHomeZone = () => {
    if (!location) return;

    Alert.alert(
      "Activer la zone Maison",
      `Enregistrer la position actuelle comme domicile ?\n\n` +
        `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}\n` +
        `Rayon de protection : ${HOME_RADIUS_M} m\n\n` +
        `Vous serez alerté si le véhicule quitte cette zone.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Activer",
          onPress: async () => {
            setActivatingHome(true);
            try {
              await api.createGeofence({
                name: "Maison",
                geofence_type: "home",
                latitude: location.latitude,
                longitude: location.longitude,
                radius_m: HOME_RADIUS_M,
                vehicle_id: vehicleId,
                notify_on_exit: true,
                notify_on_enter: false,
              });
              await loadData();
              Alert.alert("Zone Maison activée", "Protection geofencing active autour de votre domicile.");
            } catch (err) {
              Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible d'activer la zone");
            } finally {
              setActivatingHome(false);
            }
          },
        },
      ],
    );
  };

  const removeHomeZone = () => {
    if (!homeGeofence) return;
    Alert.alert(
      "Désactiver la zone Maison",
      "Supprimer la protection geofencing autour de votre domicile ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Désactiver",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteGeofence(homeGeofence.id);
              await loadData();
            } catch (err) {
              Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de supprimer la zone");
            }
          },
        },
      ],
    );
  };

  const sendRemoteCommand = async (command: string, label: string) => {
    if (!isOnline) {
      Alert.alert("Hors ligne", "Le tracker doit etre en ligne pour recevoir une commande.");
      return;
    }
    Alert.alert(label, `Envoyer la commande ${command} au vehicule ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Envoyer",
        onPress: async () => {
          setSendingCommand(command);
          try {
            await api.sendCommand(vehicleId, command);
            Alert.alert("Commande envoyee", `${label} transmise au tracker via MQTT.`);
          } catch (err) {
            Alert.alert("Erreur", err instanceof Error ? err.message : "Echec envoi commande");
          } finally {
            setSendingCommand(null);
          }
        },
      },
    ]);
  };

  const deleteVehicle = () => {
    Alert.alert("Supprimer le véhicule", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await api.deleteVehicle(vehicleId);
          router.back();
        },
      },
    ]);
  };

  if (loading || !vehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1e3a5f", COLORS.background]} style={styles.bg} />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </Pressable>
        <View style={styles.topTitle}>
          <Text style={styles.vehicleName} numberOfLines={1}>
            {vehicle.brand} {vehicle.model}
          </Text>
          {vehicle.registration ? (
            <Text style={styles.plate}>{vehicle.registration}</Text>
          ) : null}
        </View>
        <Badge label={isOnline ? "En ligne" : "Hors ligne"} variant={isOnline ? "online" : "offline"} pulse={isOnline} />
        <Pressable onPress={deleteVehicle} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </Pressable>
      </View>

      {live ? (
        <View style={styles.liveBar}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Suivi en direct</Text>
          {location?.timestamp ? (
            <Text style={styles.liveTime}>
              · {new Date(location.timestamp).toLocaleTimeString("fr-FR")}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.tabsWrap}>
        <SegmentedControl
          options={[
            { key: "live" as Tab, label: "Live" },
            { key: "stats" as Tab, label: "Stats" },
            { key: "security" as Tab, label: "Sécurité" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tab === "live" && (
          <>
            <View style={styles.gaugeRow}>
              <SpeedGauge speed={speed} size={130} />
              <View style={styles.gaugeInfo}>
                <Text style={styles.gaugeLabel}>Vitesse actuelle</Text>
                <Text style={styles.gaugeSub}>
                  {isOnline ? "Données en temps réel" : "Dernière position connue"}
                </Text>
                <View style={styles.quickStats}>
                  <View style={styles.quickStat}>
                    <Text style={styles.quickValue}>{location?.fuel_level?.toFixed(0) ?? "—"}%</Text>
                    <Text style={styles.quickLabel}>Carburant</Text>
                  </View>
                  <View style={styles.quickStat}>
                    <Text style={styles.quickValue}>{location?.battery_voltage?.toFixed(1) ?? "—"}V</Text>
                    <Text style={styles.quickLabel}>Batterie</Text>
                  </View>
                </View>
              </View>
            </View>

            <Pressable onPress={() => router.push(`/(app)/vehicle/${vehicleId}/map`)}>
              <VehicleMap location={location} track={track} />
              <View style={styles.mapHint}>
                <Ionicons name="expand-outline" size={14} color={COLORS.primary} />
                <Text style={styles.mapHintText}>Carte plein écran</Text>
              </View>
            </Pressable>

            {location ? (
              <View style={styles.statGrid}>
                <StatCard icon="thermometer-outline" label="Moteur" value={(location.engine_temperature ?? 0).toFixed(0)} unit="°C" accent={COLORS.warning} compact />
                <StatCard icon="pulse-outline" label="RPM" value={String(location.rpm ?? 0)} accent={COLORS.accent} compact />
                <StatCard icon="key-outline" label="Allumage" value={location.ignition ? "ON" : "OFF"} accent={location.ignition ? COLORS.success : COLORS.textMuted} compact />
              </View>
            ) : (
              <Card style={styles.noData}>
                <Ionicons name="location-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.noDataText}>En attente de position GPS</Text>
                <Text style={styles.noDataHint}>Lancez le simulateur pour voir le suivi live</Text>
              </Card>
            )}
          </>
        )}

        {tab === "stats" && (
          <VehicleStatsTab drivingScore={drivingScore} trips={trips} live={live} />
        )}

        {tab === "security" && (
          <VehicleSecurityTab
            security={security}
            location={location}
            speed={speed}
            isOnline={isOnline}
            isParked={isParked}
            canActivateHome={canActivateHome}
            activatingHome={activatingHome}
            homeGeofence={homeGeofence}
            geofences={geofences}
            sendingCommand={sendingCommand}
            onActivateHome={activateHomeZone}
            onRemoveHome={removeHomeZone}
            onCommand={sendRemoteCommand}
          />
        )}

        {tab === "live" ? (
          <Button
            title="Ouvrir la carte"
            variant="secondary"
            onPress={() => router.push(`/(app)/vehicle/${vehicleId}/map`)}
            fullWidth
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bg: { position: "absolute", top: 0, left: 0, right: 0, height: 200, opacity: 0.45 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topTitle: { flex: 1 },
  vehicleName: { ...FONT.heading, color: COLORS.text, fontSize: 18 },
  plate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2, letterSpacing: 1 },
  deleteBtn: { padding: 8 },
  liveBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.lg,
    marginBottom: 8,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  liveText: { color: COLORS.success, fontWeight: "700", fontSize: 13 },
  liveTime: { color: COLORS.textMuted, fontSize: 12 },
  tabsWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  scroll: { padding: SPACING.lg, paddingBottom: 40, gap: 16 },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gaugeInfo: { flex: 1 },
  gaugeLabel: { color: COLORS.text, fontWeight: "700", fontSize: 16 },
  gaugeSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  quickStats: { flexDirection: "row", gap: 20, marginTop: 14 },
  quickStat: {},
  quickValue: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  quickLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  mapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  mapHintText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  noData: { alignItems: "center", padding: 24, gap: 8 },
  noDataText: { color: COLORS.text, fontWeight: "600" },
  noDataHint: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
});
