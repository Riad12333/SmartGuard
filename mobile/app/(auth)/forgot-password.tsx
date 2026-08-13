import { Ionicons } from "@expo/vector-icons";
import { Href, Link, router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { COLORS, RADIUS } from "@/constants/theme";
import { api } from "@/services/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    setDevToken(null);
    setLoading(true);
    try {
      const result = await api.forgotPassword(email.trim().toLowerCase());
      setMessage(result.message);
      if (result.reset_token) {
        setDevToken(result.reset_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      showBack
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons les instructions pour réinitialiser votre accès."
    >
      <GlassCard>
        <View style={styles.infoBox}>
          <Ionicons name="mail-unread-outline" size={22} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Saisissez l'email associé à votre compte SmartGuard.
          </Text>
        </View>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@email.com"
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
        {message ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.success}>{message}</Text>
          </View>
        ) : null}

        {devToken ? (
          <View style={styles.devBox}>
            <Text style={styles.devTitle}>Mode développement</Text>
            <Text style={styles.devToken} selectable>
              {devToken}
            </Text>
            <Button
              title="Utiliser ce token"
              variant="secondary"
              onPress={() =>
                router.push(
                  `/(auth)/reset-password?token=${encodeURIComponent(devToken)}` as Href,
                )
              }
              fullWidth
            />
          </View>
        ) : null}

        <Button title="Envoyer le lien" onPress={handleSubmit} loading={loading} fullWidth />

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
    backgroundColor: COLORS.primaryGlow,
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
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.successGlow,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  success: { flex: 1, color: COLORS.success, fontSize: 14, lineHeight: 20 },
  devBox: {
    backgroundColor: COLORS.primaryGlow,
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    gap: 8,
  },
  devTitle: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  devToken: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
