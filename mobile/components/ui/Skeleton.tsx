import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = RADIUS.sm, style }: Props) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function VehicleCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={52} height={52} borderRadius={RADIUS.md} />
        <View style={styles.flex}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton height={4} borderRadius={2} style={{ marginTop: 16 }} />
      <View style={styles.statsRow}>
        <Skeleton width="30%" height={14} />
        <Skeleton width="30%" height={14} />
        <Skeleton width="30%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surfaceHover,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  flex: { flex: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
});
