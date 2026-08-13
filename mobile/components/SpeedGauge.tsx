import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

interface Props {
  speed: number;
  max?: number;
  size?: number;
  label?: string;
}

export function SpeedGauge({ speed, max = 180, size = 140, label = "km/h" }: Props) {
  const ratio = Math.min(speed / max, 1);
  const ringColor =
    speed > 120 ? COLORS.danger : speed > 80 ? COLORS.warning : COLORS.primary;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: COLORS.border,
          },
        ]}
      />
      <View
        style={[
          styles.progress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            borderTopColor: ratio > 0.25 ? ringColor : "transparent",
            borderRightColor: ratio > 0.5 ? ringColor : "transparent",
            borderBottomColor: ratio > 0.75 ? ringColor : "transparent",
            transform: [{ rotate: "-45deg" }],
          },
        ]}
      />
      <LinearGradient
        colors={[COLORS.surface, COLORS.backgroundElevated]}
        style={[
          styles.inner,
          {
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: (size * 0.78) / 2,
          },
        ]}
      >
        <Text style={[styles.speed, { fontSize: size * 0.28 }]}>{Math.round(speed)}</Text>
        <Text style={styles.unit}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 6,
  },
  progress: {
    position: "absolute",
    borderWidth: 6,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  speed: {
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: -1,
  },
  unit: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
