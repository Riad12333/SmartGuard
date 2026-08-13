import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, FONT } from "@/constants/theme";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  text: { flex: 1 },
  title: { ...FONT.heading, color: COLORS.text, fontSize: 18 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  action: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
});
