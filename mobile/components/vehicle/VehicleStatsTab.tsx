import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, FONT, RADIUS } from "@/constants/theme";
import type { DrivingScore, Trip } from "@/types";

const GRADES: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: COLORS.success },
  good: { label: "Bon", color: "#34d399" },
  average: { label: "Moyen", color: COLORS.warning },
  risky: { label: "À surveiller", color: COLORS.danger },
};

interface Props {
  drivingScore: DrivingScore | null;
  trips: Trip[];
  live: boolean;
}

function formatTripTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h} h ${rm} min` : `${h} h`;
}

export function VehicleStatsTab({ drivingScore, trips, live }: Props) {
  const latestTrip = trips[0];
  const activeTrip = latestTrip?.status === "active";
  const grade = drivingScore ? GRADES[drivingScore.grade] ?? GRADES.average : null;
  const scorePct = drivingScore ? Math.min(100, Math.max(0, drivingScore.score)) : 0;

  const events = drivingScore
    ? [
        { key: "brake", label: "Freinages brusques", value: drivingScore.harsh_braking_count, icon: "hand-left-outline" as const },
        { key: "accel", label: "Accélérations fortes", value: drivingScore.harsh_accel_count, icon: "speedometer-outline" as const },
        { key: "speed", label: "Dépassements", value: drivingScore.overspeed_count, icon: "warning-outline" as const },
        { key: "night", label: "Trajets de nuit", value: drivingScore.night_trips_count, icon: "moon-outline" as const },
      ]
    : [];

  return (
    <View style={styles.wrap}>
      {drivingScore && grade ? (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Conduite</Text>
            {live ? (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagText}>Màj live</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreBig, { color: grade.color }]}>{drivingScore.score}</Text>
            <View style={styles.scoreMeta}>
              <Text style={[styles.gradeText, { color: grade.color }]}>{grade.label}</Text>
              <Text style={styles.scoreSub}>
                {drivingScore.distance_km.toFixed(1)} km parcourus · 24 h
              </Text>
            </View>
          </View>

          <View style={styles.barTrack}>
            <LinearGradient
              colors={[grade.color, `${grade.color}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${scorePct}%` }]}
            />
          </View>

          {events.some((e) => e.value > 0) ? (
            <View style={styles.eventList}>
              {events.map((ev) => (
                <View key={ev.key} style={styles.eventRow}>
                  <Ionicons name={ev.icon} size={16} color={ev.value > 0 ? COLORS.textMuted : COLORS.border} />
                  <Text style={styles.eventLabel}>{ev.label}</Text>
                  <Text style={[styles.eventValue, ev.value > 0 && styles.eventValueWarn]}>{ev.value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.cleanDrive}>Aucun incident relevé sur la période.</Text>
          )}
        </View>
      ) : (
        <View style={styles.emptyPanel}>
          <Ionicons name="analytics-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Pas encore de score</Text>
          <Text style={styles.emptySub}>Roulez un peu pour générer une analyse de conduite.</Text>
        </View>
      )}

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>
            {activeTrip ? "Trajet en cours" : latestTrip ? "Dernier trajet" : "Trajets"}
          </Text>
          {activeTrip ? <View style={styles.activePill}><Text style={styles.activePillText}>En route</Text></View> : null}
        </View>

        {latestTrip ? (
          <>
            <View style={styles.tripStrip}>
              <TripStat value={latestTrip.distance_km.toFixed(1)} unit="km" />
              <View style={styles.tripSep} />
              <TripStat value={String(formatDuration(latestTrip.duration_seconds))} unit="" />
              <View style={styles.tripSep} />
              <TripStat value={latestTrip.avg_speed_kmh.toFixed(0)} unit="km/h moy." />
              <View style={styles.tripSep} />
              <TripStat value={latestTrip.max_speed_kmh.toFixed(0)} unit="max" />
            </View>
            <Text style={styles.tripWhen}>
              {activeTrip ? "Démarré" : "Terminé"} · {formatTripTime(latestTrip.started_at)}
            </Text>
          </>
        ) : (
          <Text style={styles.emptySub}>Aucun trajet enregistré pour l&apos;instant.</Text>
        )}

        {trips.length > 1 ? (
          <Text style={styles.tripCount}>
            + {trips.length - 1} autre{trips.length > 2 ? "s" : ""} trajet{trips.length > 2 ? "s" : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TripStat({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.tripStat}>
      <Text style={styles.tripStatValue}>{value}</Text>
      {unit ? <Text style={styles.tripStatUnit}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  panelTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveTagText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successGlow,
  },
  activePillText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    marginBottom: 12,
  },
  scoreBig: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 52,
  },
  scoreMeta: { flex: 1, paddingBottom: 6 },
  gradeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scoreSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.backgroundElevated,
    overflow: "hidden",
    marginBottom: 16,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  eventList: { gap: 2 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  eventLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  eventValue: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "right",
  },
  eventValueWarn: {
    color: COLORS.warning,
  },
  cleanDrive: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  tripStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tripStat: { flex: 1, alignItems: "center", gap: 2 },
  tripStatValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  tripStatUnit: {
    ...FONT.label,
    color: COLORS.textMuted,
    fontSize: 9,
  },
  tripSep: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
  },
  tripWhen: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
  tripCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  emptyPanel: {
    alignItems: "center",
    padding: 28,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
