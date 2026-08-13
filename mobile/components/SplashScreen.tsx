import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "@/constants/theme";

interface Props {
  onFinish?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 2800 }: Props) {
  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.12,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.85, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
      ]),
    );

    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs - 400,
      delay: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    intro.start(() => {
      pulse.start();
      glowPulse.start();
    });

    const timer = setTimeout(() => onFinish?.(), durationMs);
    return () => {
      clearTimeout(timer);
      pulse.stop();
      glowPulse.stop();
    };
  }, [
    durationMs,
    glowOpacity,
    logoOpacity,
    logoScale,
    onFinish,
    progress,
    ringOpacity,
    ringScale,
  ]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a1628", "#060b14", "#040810"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${(i + 1) * 14}%` }]} />
        ))}
      </View>

      <Animated.View style={[styles.glowOrb, { opacity: glowOpacity }]} />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require("@/assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="SmartGuard"
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.footerText}>Initialisation sécurisée…</Text>
      </View>
    </View>
  );
}

const LOGO_WIDTH = 240;
const LOGO_HEIGHT = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  glowOrb: {
    position: "absolute",
    alignSelf: "center",
    top: "28%",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.primaryGlow,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  ring: {
    position: "absolute",
    width: LOGO_WIDTH + 40,
    height: LOGO_WIDTH + 40,
    borderRadius: (LOGO_WIDTH + 40) / 2,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(59,130,246,0.06)",
  },
  logoWrap: {
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 14,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    borderRadius: 28,
  },
  footer: {
    paddingHorizontal: 48,
    paddingBottom: 52,
    gap: 12,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
