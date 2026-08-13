import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Href, Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthFeatureRow } from "@/components/auth/AuthFeatureRow";
import { AuthLogoHero } from "@/components/auth/AuthLogoHero";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { COLORS, RADIUS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(app)/(tabs)");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connectez-vous pour suivre et sécuriser vos véhicules en temps réel."
      footer={
        <Text style={styles.trust}>
          Chiffrement JWT · Données hébergées en sécurité
        </Text>
      }
    >
      <AuthLogoHero />
      <AuthFeatureRow />

      <GlassCard style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Connexion</Text>
          <View style={styles.securePill}>
            <Ionicons name="lock-closed" size={12} color={COLORS.success} />
            <Text style={styles.secureText}>Sécurisé</Text>
          </View>
        </View>

        <Input
          label="Adresse email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@email.com"
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          autoComplete="password"
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Button title="Se connecter" onPress={handleLogin} loading={loading} fullWidth />

        <Link href={"/(auth)/forgot-password" as Href} asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkMuted}>Mot de passe oublié ?</Text>
            <Text style={styles.linkAction}>Réinitialiser</Text>
          </Pressable>
        </Link>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Nouveau sur SmartGuard ?</Text>
          <View style={styles.dividerLine} />
        </View>

        <Link href="/(auth)/register" asChild>
          <Button title="Créer un compte gratuit" variant="secondary" fullWidth />
        </Link>
      </GlassCard>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  formCard: { gap: 2 },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successGlow,
  },
  secureText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
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
  error: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 14,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
  },
  linkMuted: { color: COLORS.textMuted, fontSize: 14 },
  linkAction: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  trust: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
