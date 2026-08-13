import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { SettingsRow } from "@/components/ui/SettingsRow";
import {
  pickProfileImage,
  ProfileAvatar,
  requestPhotoPermissions,
} from "@/components/profile/ProfileAvatar";
import { COLORS, FONT, RADIUS, SPACING } from "@/constants/theme";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

function StatChip({
  icon,
  value,
  label,
  color,
  glow,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  glow: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statIcon, { backgroundColor: glow }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const loadUser = useAuthStore((s) => s.loadUser);

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPwdEdit, setShowPwdEdit] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [avatarCacheKey, setAvatarCacheKey] = useState<string | undefined>(user?.updated_at);

  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
  }, [user?.first_name, user?.last_name]);

  useEffect(() => {
    setAvatarCacheKey(user?.updated_at);
  }, [user?.updated_at, user?.avatar_url]);

  const loadStats = useCallback(async () => {
    const [vehicles, alerts] = await Promise.all([
      api.getVehicles().catch(() => []),
      api.getAlerts({ acknowledged: false, limit: 50 }).catch(() => []),
    ]);
    setVehicleCount(vehicles.length);
    setOnlineCount(vehicles.filter((v) => v.tracker?.is_online).length);
    setAlertCount(alerts.filter((a) => a.severity !== "info").length);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadUser(), loadStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadStats, loadUser]);

  useFocusEffect(
    useCallback(() => {
      loadUser().catch(() => undefined);
      loadStats().catch(() => undefined);
    }, [loadStats, loadUser]),
  );

  const showMessage = (text: string, type: "success" | "error") => {
    setMsg(text);
    setMsgType(type);
  };

  const saveProfile = async () => {
    setLoading(true);
    setMsg("");
    try {
      await api.updateProfile({ first_name: firstName, last_name: lastName });
      await loadUser();
      showMessage("Profil mis à jour avec succès", "success");
      setShowProfileEdit(false);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setLoading(true);
    setMsg("");
    try {
      await api.changePassword(currentPwd, newPwd);
      setCurrentPwd("");
      setNewPwd("");
      showMessage("Mot de passe modifié", "success");
      setShowPwdEdit(false);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setLoading(false);
    }
  };

  const uploadPickedImage = async (from: "library" | "camera") => {
    const granted = await requestPhotoPermissions(from);
    if (!granted) {
      showMessage(
        from === "library"
          ? "Autorisez l'accès à la galerie dans les réglages"
          : "Autorisez l'accès à la caméra dans les réglages",
        "error",
      );
      return;
    }

    const asset = await pickProfileImage(from);
    if (!asset?.uri) return;

    setLocalAvatarUri(asset.uri);
    setAvatarUploading(true);
    setMsg("");
    try {
      const updated = await api.uploadAvatar(asset.uri, asset.mimeType ?? "image/jpeg");
      useAuthStore.getState().setUser(updated);
      await loadUser();
      const fresh = useAuthStore.getState().user;
      setAvatarCacheKey(fresh?.updated_at ?? String(Date.now()));
      if (fresh?.avatar_url) {
        setLocalAvatarUri(null);
      }
      showMessage("Photo de profil mise à jour", "success");
    } catch (e) {
      setLocalAvatarUri(null);
      showMessage(e instanceof Error ? e.message : "Echec upload photo", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarUploading(true);
    setMsg("");
    try {
      const updated = await api.deleteAvatar();
      useAuthStore.getState().setUser(updated);
      await loadUser();
      setLocalAvatarUri(null);
      setAvatarCacheKey(String(Date.now()));
      showMessage("Photo de profil supprimée", "success");
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter de SmartGuard ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#152238", "#0a1220", COLORS.background]}
        locations={[0, 0.35, 1]}
        style={styles.headerBg}
      />
      <View style={styles.orb} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Mon profil</Text>
          <Text style={styles.pageSub}>Gérez votre compte et vos préférences</Text>
        </View>

        <GlassCard style={styles.heroCard}>
          <ProfileAvatar
            name={fullName}
            avatarUrl={user?.avatar_url}
            localPreviewUri={localAvatarUri}
            cacheKey={avatarCacheKey}
            uploading={avatarUploading}
            onPickFromLibrary={() => uploadPickedImage("library")}
            onTakePhoto={() => uploadPickedImage("camera")}
            onRemove={user?.avatar_url ? removeAvatar : undefined}
          />
          <Text style={styles.name}>{fullName || "Utilisateur"}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.memberBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.memberText}>Membre vérifié</Text>
            </View>
            {memberSince ? (
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.dateText}>Depuis {memberSince}</Text>
              </View>
            ) : null}
          </View>
        </GlassCard>

        <View style={styles.statsRow}>
          <StatChip
            icon="car-sport"
            value={vehicleCount}
            label="Véhicules"
            color={COLORS.primary}
            glow={COLORS.primaryGlow}
          />
          <StatChip
            icon="radio-outline"
            value={onlineCount}
            label="En ligne"
            color={COLORS.success}
            glow={COLORS.successGlow}
          />
          <StatChip
            icon="notifications"
            value={alertCount}
            label="Alertes"
            color={COLORS.warning}
            glow={COLORS.warningGlow}
          />
        </View>

        {msg ? (
          <View
            style={[
              styles.msgBanner,
              msgType === "error" ? styles.msgBannerError : styles.msgBannerSuccess,
            ]}
          >
            <Ionicons
              name={msgType === "error" ? "alert-circle" : "checkmark-circle"}
              size={18}
              color={msgType === "error" ? COLORS.danger : COLORS.success}
            />
            <Text style={[styles.msg, msgType === "error" && styles.msgError]}>{msg}</Text>
          </View>
        ) : null}

        <Text style={styles.groupLabel}>Compte</Text>
        <GlassCard padding={0} style={styles.group}>
          <SettingsRow
            icon="person-outline"
            label="Informations personnelles"
            value={showProfileEdit ? "Modifier" : undefined}
            onPress={() => {
              setShowPwdEdit(false);
              setShowProfileEdit(!showProfileEdit);
            }}
          />
          {showProfileEdit ? (
            <View style={styles.editBlock}>
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={styles.nameField}>
                  <Input label="Nom" value={lastName} onChangeText={setLastName} />
                </View>
              </View>
              <Button title="Enregistrer le profil" onPress={saveProfile} loading={loading} fullWidth />
            </View>
          ) : null}

          <SettingsRow
            icon="lock-closed-outline"
            iconColor={COLORS.warning}
            iconBg={COLORS.warningGlow}
            label="Mot de passe"
            onPress={() => {
              setShowProfileEdit(false);
              setShowPwdEdit(!showPwdEdit);
            }}
          />
          {showPwdEdit ? (
            <View style={styles.editBlock}>
              <Input
                label="Mot de passe actuel"
                value={currentPwd}
                onChangeText={setCurrentPwd}
                secureTextEntry
              />
              <Input
                label="Nouveau mot de passe"
                value={newPwd}
                onChangeText={setNewPwd}
                secureTextEntry
                placeholder="8+ caractères"
              />
              <Button
                title="Modifier le mot de passe"
                variant="secondary"
                onPress={changePassword}
                loading={loading}
                fullWidth
              />
            </View>
          ) : null}

          <SettingsRow
            icon="add-circle-outline"
            iconColor={COLORS.accent}
            iconBg={COLORS.accentGlow}
            label="Ajouter un véhicule"
            onPress={() => router.push("/(app)/add-vehicle")}
          />
        </GlassCard>

        <Text style={styles.groupLabel}>Application</Text>
        <GlassCard padding={0} style={styles.group}>
          <SettingsRow icon="pulse-outline" label="Suivi temps réel" value="Actif" showChevron={false} />
          <SettingsRow
            icon="notifications-outline"
            label="Notifications push"
            value="Activées"
            showChevron={false}
          />
          <SettingsRow
            icon="server-outline"
            label="Connexion API"
            value="Sécurisée"
            showChevron={false}
          />
          <SettingsRow
            icon="information-circle-outline"
            label="Version SmartGuard"
            value="1.0.0"
            showChevron={false}
          />
        </GlassCard>

        <GlassCard style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Image source={require("@/assets/logo.png")} style={styles.aboutLogo} />
            <View style={styles.aboutText}>
              <Text style={styles.aboutTitle}>SmartGuard</Text>
              <Text style={styles.aboutDesc}>
                Vehicle Tracking & Security — géolocalisation et protection automobile.
              </Text>
            </View>
          </View>
        </GlassCard>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  orb: {
    position: "absolute",
    top: 40,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  scroll: { padding: SPACING.lg, paddingBottom: 120 },
  pageHeader: { marginBottom: SPACING.lg },
  pageTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  heroCard: {
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  name: {
    ...FONT.heading,
    color: COLORS.text,
    fontSize: 24,
  },
  email: {
    color: COLORS.textMuted,
    marginTop: 4,
    fontSize: 14,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successGlow,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  memberText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: SPACING.lg,
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: "rgba(19,31,53,0.65)",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  msgBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  msgBannerSuccess: { backgroundColor: COLORS.successGlow },
  msgBannerError: { backgroundColor: COLORS.dangerGlow },
  msg: { color: COLORS.success, fontWeight: "600", flex: 1 },
  msgError: { color: COLORS.danger },
  groupLabel: {
    ...FONT.label,
    color: COLORS.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: { marginBottom: SPACING.lg, overflow: "hidden", paddingHorizontal: 16 },
  editBlock: {
    marginHorizontal: -16,
    padding: SPACING.md,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: "rgba(6,10,20,0.35)",
  },
  nameRow: { flexDirection: "row", gap: 10 },
  nameField: { flex: 1 },
  aboutCard: { marginBottom: SPACING.lg },
  aboutRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  aboutLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  aboutText: { flex: 1 },
  aboutTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  aboutDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.dangerGlow,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 16,
  },
});
