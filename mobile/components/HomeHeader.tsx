import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { Logo } from "@/components/ui/Logo";
import { COLORS, FONT, RADIUS } from "@/constants/theme";
import { useCachedAvatarUri } from "@/utils/avatar";

interface Props {
  greeting: string;
  firstName: string;
  avatarUrl?: string | null;
  avatarCacheKey?: string;
  onAddVehicle: () => void;
  onProfile?: () => void;
}

export function HomeHeader({
  greeting,
  firstName,
  avatarUrl,
  avatarCacheKey,
  onAddVehicle,
  onProfile,
}: Props) {
  const resolvedAvatar = useCachedAvatarUri(avatarUrl, avatarCacheKey);
  const initials = firstName.slice(0, 1).toUpperCase();
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [resolvedAvatar]);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["rgba(26,58,107,0.55)", "rgba(6,11,20,0)"]}
        style={styles.fade}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <View style={styles.logoFrame}>
            <Logo size={28} showText={false} />
          </View>
          <View>
            <Text style={styles.brandName}>SmartGuard</Text>
            <Text style={styles.brandTag}>Protection véhicule</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onAddVehicle}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            hitSlop={6}
          >
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="add" size={20} color={COLORS.text} />
          </Pressable>

          {onProfile ? (
            <Pressable
              onPress={onProfile}
              style={({ pressed }) => [styles.avatarBtn, pressed && styles.actionPressed]}
              hitSlop={6}
            >
              {resolvedAvatar && !avatarFailed ? (
                <Image
                  source={{ uri: resolvedAvatar }}
                  style={styles.avatarImage}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initials}</Text>
                </LinearGradient>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.greetingLine}>
          {greeting},{" "}
          <Text style={styles.greetingName}>{firstName}</Text>
        </Text>
        <Text style={styles.greetingSub}>Votre flotte en un coup d&apos;œil</Text>
      </View>

      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 10 : 6,
    paddingBottom: 18,
  },
  fade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },
  logoFrame: {
    width: 42,
    height: 42,
    borderRadius: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  brandTag: {
    ...FONT.label,
    color: COLORS.accent,
    fontSize: 9,
    marginTop: 1,
    opacity: 0.9,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(19,31,53,0.5)",
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(59,130,246,0.35)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  greetingBlock: {
    gap: 5,
  },
  greetingLine: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 28,
  },
  greetingName: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  greetingSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  rule: {
    height: 1,
    marginTop: 18,
    backgroundColor: COLORS.borderLight,
  },
});
