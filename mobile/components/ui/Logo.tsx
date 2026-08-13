import { Image, ImageStyle, StyleSheet, Text, View, ViewStyle } from "react-native";

import { COLORS, FONT } from "@/constants/theme";

interface Props {
  size?: number;
  /** Affiche le logo complet (avec texte intégré) */
  showText?: boolean;
  style?: ViewStyle;
}

export function Logo({ size = 48, showText = true, style }: Props) {
  const imageStyle: ImageStyle = showText
    ? { width: size * 2.4, height: size * 1.05, borderRadius: size * 0.12 }
    : { width: size, height: size, borderRadius: size * 0.22 };

  if (showText) {
    return (
      <View style={[styles.fullWrap, style]}>
        <Image
          source={require("@/assets/logo.png")}
          style={imageStyle}
          resizeMode="contain"
          accessibilityLabel="SmartGuard"
        />
      </View>
    );
  }

  return (
    <View style={[styles.iconWrap, style]}>
      <Image
        source={require("@/assets/logo.png")}
        style={imageStyle}
        resizeMode="cover"
        accessibilityLabel="SmartGuard"
      />
    </View>
  );
}

/** Variante compacte avec texte à côté (accueil) */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <Logo size={size} showText={false} />
      <View style={styles.textWrap}>
        <Text style={[styles.title, { fontSize: size * 0.42 }]}>SmartGuard</Text>
        <Text style={styles.tagline}>Protection véhicule</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWrap: {
    alignItems: "center",
  },
  iconWrap: {
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textWrap: {
    gap: 2,
  },
  title: {
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tagline: {
    ...FONT.caption,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
