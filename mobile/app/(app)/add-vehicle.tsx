import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COLORS, SPACING } from "@/constants/theme";
import { api } from "@/services/api";

export default function AddVehicleScreen() {
  const insets = useSafeAreaInsets();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [registration, setRegistration] = useState("");
  const [deviceId, setDeviceId] = useState("SG-DEVICE-001");
  const [imei, setImei] = useState("SIMULATED-001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const vehicle = await api.createVehicle({
        brand: brand.trim(),
        model: model.trim(),
        year: year ? Number(year) : undefined,
        color: color || undefined,
        registration: registration || undefined,
        device_id: deviceId || undefined,
        imei: imei || undefined,
      });
      router.replace(`/(app)/vehicle/${vehicle.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Ajouter un vehicule</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Input label="Marque *" value={brand} onChangeText={setBrand} placeholder="Peugeot" />
        <Input label="Modele *" value={model} onChangeText={setModel} placeholder="208" />
        <Input label="Annee" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2022" />
        <Input label="Couleur" value={color} onChangeText={setColor} placeholder="Blanc" />
        <Input label="Immatriculation" value={registration} onChangeText={setRegistration} placeholder="123-ABC-16" />

        <Text style={styles.sectionLabel}>Tracker GPS</Text>
        <Input label="Device ID" value={deviceId} onChangeText={setDeviceId} placeholder="SG-DEVICE-001" />
        <Input label="IMEI" value={imei} onChangeText={setImei} placeholder="SIMULATED-001" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Ajouter le vehicule" onPress={submit} loading={loading} fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  form: { padding: SPACING.lg, paddingBottom: 40 },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  error: { color: COLORS.danger, marginBottom: 12 },
});
