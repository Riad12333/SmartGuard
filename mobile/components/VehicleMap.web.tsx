import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/config";
import type { Location, PositionHistoryItem } from "@/types";

interface Props {
  location: Location | null;
  track: PositionHistoryItem[];
  fullScreen?: boolean;
}

export function VehicleMap({ location, track, fullScreen }: Props) {
  const openInMaps = () => {
    if (!location) return;
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Text style={styles.title}>Carte (mobile uniquement)</Text>
      {location ? (
        <>
          <Text style={styles.coords}>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
          <Text style={styles.meta}>
            Vitesse: {location.speed?.toFixed(0) ?? 0} km/h | Points: {track.length}
          </Text>
          <Pressable style={styles.button} onPress={openInMaps}>
            <Text style={styles.buttonText}>Ouvrir dans Google Maps</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.meta}>En attente de position GPS...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    padding: 20,
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  coords: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  meta: {
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  fullScreen: {
    height: "100%",
    flex: 1,
    borderRadius: 0,
  },
});
