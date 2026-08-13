import { ReactNode } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { COLORS, RADIUS, SHADOW } from "@/constants/theme";

interface Props extends ViewProps {
  children: ReactNode;
  glow?: boolean;
  padding?: number;
}

export function Card({ children, glow, padding = 18, style, ...props }: Props) {
  return (
    <View
      style={[
        styles.card,
        glow && SHADOW.glow,
        { padding },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
});
