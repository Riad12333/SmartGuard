import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "@/constants/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

export function SettingsRow({
  icon,
  iconColor = COLORS.primary,
  iconBg = COLORS.primaryGlow,
  label,
  value,
  onPress,
  destructive,
  showChevron = !!onPress,
}: Props) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
  },
  value: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginRight: 4,
  },
  destructive: { color: COLORS.danger },
  pressed: { opacity: 0.7 },
});
