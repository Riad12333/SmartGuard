import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

interface Props extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading,
  icon,
  fullWidth,
  disabled,
  style,
  ...props
}: Props) {
  const isPrimary = variant === "primary";

  if (isPrimary) {
    return (
      <Pressable
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          fullWidth && styles.fullWidth,
          pressed && styles.pressed,
          style as ViewStyle,
        ]}
        {...props}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {icon}
              <Text style={styles.primaryText}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyle = {
    secondary: styles.secondary,
    danger: styles.danger,
    ghost: styles.ghost,
  }[variant];

  const textStyle = {
    secondary: styles.secondaryText,
    danger: styles.dangerText,
    ghost: styles.ghostText,
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  danger: {
    backgroundColor: COLORS.dangerGlow,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  dangerText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  ghost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  ghostText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
