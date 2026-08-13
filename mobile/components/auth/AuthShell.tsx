import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "@/constants/theme";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  footer?: ReactNode;
}

export function AuthShell({ children, title, subtitle, showBack, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#152238", "#0a1220", COLORS.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbPrimary]} />
      <View style={[styles.orb, styles.orbAccent]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.accent} />
              <Text style={styles.badgeText}>IoT Automobile</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {children}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbPrimary: {
    top: -100,
    right: -80,
    width: 240,
    height: 240,
    backgroundColor: "rgba(59,130,246,0.14)",
  },
  orbAccent: {
    bottom: 80,
    left: -100,
    width: 220,
    height: 220,
    backgroundColor: "rgba(6,182,212,0.1)",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  backSpacer: { height: 44, marginBottom: 8 },
  header: {
    marginBottom: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentGlow,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.25)",
    marginBottom: 16,
  },
  badgeText: {
    ...FONT.label,
    color: COLORS.accent,
    textTransform: "uppercase",
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 320,
  },
  footer: {
    marginTop: 28,
    alignItems: "center",
  },
});
