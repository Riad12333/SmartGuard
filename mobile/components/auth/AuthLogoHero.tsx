import { Image, StyleSheet, View } from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

export function AuthLogoHero() {
  return (
    <View style={styles.wrap}>
      <Image
        source={require("@/assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="SmartGuard — Vehicle Tracking and Security"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 22,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.xl,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logo: {
    width: "100%",
    maxWidth: 300,
    height: 130,
  },
});
