import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { VehicleMarker } from "@/components/VehicleMarker";
import { DARK_MAP_STYLE } from "@/constants/mapStyle";
import { COLORS, FONT, RADIUS, SHADOW } from "@/constants/theme";
import type { Location, Vehicle } from "@/types";

interface Props {
  vehicles: Vehicle[];
  locations: Record<number, Location | null>;
}

export function FleetMapPreview({ vehicles, locations }: Props) {
  const points = useMemo(
    () =>
      vehicles
        .map((v) => ({ vehicle: v, loc: locations[v.id] }))
        .filter((p): p is { vehicle: Vehicle; loc: Location } => !!p.loc),
    [vehicles, locations],
  );

  const region = useMemo(() => {
    if (points.length === 0) {
      return { latitude: 36.7525, longitude: 3.042, latitudeDelta: 0.15, longitudeDelta: 0.15 };
    }
    const lats = points.map((p) => p.loc.latitude);
    const lngs = points.map((p) => p.loc.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.8),
      longitudeDelta: Math.max(0.04, (maxLng - minLng) * 1.8),
    };
  }, [points]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Position flotte</Text>
      <View style={styles.container}>
        <MapView
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
          region={region}
          customMapStyle={DARK_MAP_STYLE}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          {points.map(({ vehicle, loc }) => (
            <Marker
              key={vehicle.id}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <VehicleMarker
                isOnline={loc.is_online ?? vehicle.tracker?.is_online ?? false}
                heading={loc.heading}
                size={28}
              />
            </Marker>
          ))}
        </MapView>
        <LinearGradientFade />
      </View>
    </View>
  );
}

function LinearGradientFade() {
  return (
    <>
      <View style={styles.topFade} pointerEvents="none" />
      <View style={styles.overlay} pointerEvents="none" />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    ...FONT.label,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  container: {
    height: 188,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  map: { flex: 1 },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: "rgba(6,11,20,0.35)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.12)",
  },
});
