import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, FONT, RADIUS } from "@/constants/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  accent?: string;
  compact?: boolean;
}

export function StatCard({ icon, label, value, unit, accent = COLORS.primary, compact }: Props) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={compact ? 16 : 18} color={accent} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, compact && styles.valueCompact]}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: "30%",
  },
  compact: {
    padding: 10,
    minWidth: "31%",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...FONT.label,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  value: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  valueCompact: {
    fontSize: 15,
  },
  unit: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
});
