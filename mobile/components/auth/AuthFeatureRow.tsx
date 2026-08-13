import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

const FEATURES = [
  { icon: "navigate" as const, label: "GPS live", color: COLORS.primary },
  { icon: "shield-checkmark" as const, label: "Anti-vol", color: COLORS.success },
  { icon: "pulse" as const, label: "Score ML", color: COLORS.accent },
] as const;

export function AuthFeatureRow() {
  return (
    <View style={styles.row}>
      {FEATURES.map((item) => (
        <View key={item.label} style={styles.chip}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: RADIUS.lg,
    backgroundColor: "rgba(19,31,53,0.65)",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});
