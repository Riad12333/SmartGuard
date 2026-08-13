import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

interface Props {
  isOnline: boolean;
  heading?: number | null;
  size?: number;
}

export function VehicleMarker({ isOnline, heading = 0, size = 36 }: Props) {
  const color = isOnline ? COLORS.success : COLORS.danger;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.pulse,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            backgroundColor: isOnline ? COLORS.successGlow : COLORS.dangerGlow,
          },
        ]}
      />
      <View
        style={[
          styles.arrow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ rotate: `${heading ?? 0}deg` }],
          },
        ]}
      >
        <Ionicons name="navigate" size={size * 0.5} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    opacity: 0.6,
  },
  arrow: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
});
