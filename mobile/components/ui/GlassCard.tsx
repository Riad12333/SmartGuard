import { BlurView } from "expo-blur";
import { ReactNode } from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";

import { COLORS, RADIUS, SHADOW } from "@/constants/theme";

interface Props extends ViewProps {
  children: ReactNode;
  intensity?: number;
  padding?: number;
}

export function GlassCard({ children, intensity = 40, padding = 20, style, ...props }: Props) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.fallback, { padding }, style]} {...props}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} {...props}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.overlay, { padding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  overlay: {
    backgroundColor: COLORS.surfaceGlass,
  },
  fallback: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
});
