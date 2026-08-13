import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

import { VehicleMarker } from "@/components/VehicleMarker";
import { DARK_MAP_STYLE } from "@/constants/mapStyle";
import { COLORS } from "@/constants/config";
import type { Location, PositionHistoryItem } from "@/types";

interface Props {
  location: Location | null;
  track: PositionHistoryItem[];
  fullScreen?: boolean;
}

export function VehicleMap({ location, track, fullScreen }: Props) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: fullScreen ? 0.012 : 0.02,
        longitudeDelta: fullScreen ? 0.012 : 0.02,
      },
      600,
    );
  }, [location?.latitude, location?.longitude, fullScreen]);

  const initialRegion = {
    latitude: location?.latitude ?? 36.7525,
    longitude: location?.longitude ?? 3.042,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const polyline = track
    .slice()
    .reverse()
    .map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));

  if (location) {
    polyline.push({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={false}
        showsCompass={fullScreen}
        showsTraffic={false}
      >
        {polyline.length > 1 ? (
          <>
            <Polyline
              coordinates={polyline}
              strokeColor="rgba(239, 68, 68, 0.28)"
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={polyline}
              strokeColor={COLORS.danger}
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
            />
          </>
        ) : null}

        {location ? (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={location.heading ?? 0}
          >
            <VehicleMarker
              isOnline={location.is_online}
              heading={location.heading}
              size={fullScreen ? 44 : 36}
            />
          </Marker>
        ) : null}
      </MapView>

      {location && !fullScreen ? (
        <View style={styles.speedBadge}>
          <Animated.Text style={styles.speedText}>
            {location.speed?.toFixed(0) ?? 0} km/h
          </Animated.Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: {
    flex: 1,
  },
  fullScreen: {
    height: "100%",
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
  },
  speedBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(6,11,20,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  speedText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 14,
  },
});
