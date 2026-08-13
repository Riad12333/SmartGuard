import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

interface Props {
  online: number;
  total: number;
  size?: number;
}

export function FleetRing({ online, total, size = 88 }: Props) {
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  const healthy = pct >= 80;
  const warn = pct >= 40 && pct < 80;
  const ringColor = healthy ? COLORS.success : warn ? COLORS.warning : COLORS.danger;
  const glowColor = healthy ? COLORS.successGlow : warn ? COLORS.warningGlow : COLORS.dangerGlow;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
          },
        ]}
      />
      <View
        style={[
          styles.inner,
          {
            width: size - 18,
            height: size - 18,
            borderRadius: (size - 18) / 2,
            backgroundColor: glowColor,
          },
        ]}
      />
      <View style={styles.center}>
        <Text style={[styles.pct, { color: ringColor }]}>{pct}%</Text>
        <Text style={styles.caption}>Flotte</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    borderWidth: 5,
    borderColor: "rgba(148,163,184,0.12)",
  },
  ring: {
    position: "absolute",
    borderWidth: 5,
    opacity: 0.95,
  },
  inner: {
    position: "absolute",
    opacity: 0.5,
  },
  center: {
    alignItems: "center",
  },
  pct: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  caption: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 1,
  },
});
