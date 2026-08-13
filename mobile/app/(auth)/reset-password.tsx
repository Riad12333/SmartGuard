import { Ionicons } from "@expo/vector-icons";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { COLORS, RADIUS } from "@/constants/theme";
import { api } from "@/services/api";

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(tokenParam ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token.trim(), password);
      router.replace("/(auth)/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      showBack
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe fort pour sécuriser votre compte."
    >
      <GlassCard>
        <View style={styles.infoBox}>
          <Ionicons name="key-outline" size={22} color={COLORS.accent} />
          <Text style={styles.infoText}>
            Collez le token reçu par email ou celui affiché en mode développement.
          </Text>
        </View>

        <Input
          label="Token de réinitialisation"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
        <Input
          label="Nouveau mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="8+ caractères, lettre + chiffre"
        />
        <Input
          label="Confirmer le mot de passe"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Button title="Réinitialiser le mot de passe" onPress={handleSubmit} loading={loading} fullWidth />

        <Link href="/(auth)/login" asChild>
          <Button title="Retour à la connexion" variant="ghost" fullWidth />
        </Link>
      </GlassCard>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentGlow,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
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
});
