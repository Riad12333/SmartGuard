import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

type Variant = "online" | "offline" | "warning" | "danger" | "info";

interface Props {
  label: string;
  variant?: Variant;
  pulse?: boolean;
}

const VARIANTS: Record<Variant, { bg: string; color: string; dot: string }> = {
  online: { bg: COLORS.successGlow, color: COLORS.success, dot: COLORS.success },
  offline: { bg: "rgba(100,116,139,0.2)", color: COLORS.textMuted, dot: COLORS.textMuted },
  warning: { bg: COLORS.warningGlow, color: COLORS.warning, dot: COLORS.warning },
  danger: { bg: COLORS.dangerGlow, color: COLORS.danger, dot: COLORS.danger },
  info: { bg: COLORS.primaryGlow, color: COLORS.primary, dot: COLORS.primary },
};

export function Badge({ label, variant = "info", pulse }: Props) {
  const v = VARIANTS[variant] ?? VARIANTS.info;
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, dotScale]);

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: v.dot },
          pulse && { transform: [{ scale: dotScale }] },
        ]}
      />
      <Text style={[styles.text, { color: v.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
