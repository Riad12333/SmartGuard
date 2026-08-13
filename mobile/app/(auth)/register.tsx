import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { COLORS, RADIUS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      await register(firstName.trim(), lastName.trim(), email.trim().toLowerCase(), password);
      router.replace("/(app)/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      showBack
      title="Créer votre compte"
      subtitle="Rejoignez SmartGuard et connectez votre premier tracker GPS en quelques minutes."
    >
      <View style={styles.steps}>
        {["Compte", "Véhicule", "Suivi"].map((step, i) => (
          <View key={step} style={styles.stepItem}>
            <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
              <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{step}</Text>
          </View>
        ))}
      </View>

      <GlassCard>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Input label="Prénom" value={firstName} onChangeText={setFirstName} placeholder="Jean" />
          </View>
          <View style={styles.nameField}>
            <Input label="Nom" value={lastName} onChangeText={setLastName} placeholder="Dupont" />
          </View>
        </View>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@email.com"
        />
        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="8+ caractères, lettre et chiffre"
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Button title="Créer mon compte" onPress={handleRegister} loading={loading} fullWidth />

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkMuted}>Déjà inscrit ?</Text>
            <Text style={styles.linkAction}>Se connecter</Text>
          </Pressable>
        </Link>
      </GlassCard>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepItem: { alignItems: "center", gap: 6, flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  stepNum: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
  stepNumActive: { color: COLORS.primary },
  stepLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  stepLabelActive: { color: COLORS.textSecondary },
  nameRow: { flexDirection: "row", gap: 10 },
  nameField: { flex: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerGlow,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  error: { flex: 1, color: COLORS.danger, fontSize: 14 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  linkMuted: { color: COLORS.textMuted, fontSize: 14 },
  linkAction: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
});
