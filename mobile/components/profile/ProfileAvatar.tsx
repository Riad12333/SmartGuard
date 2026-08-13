import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS } from "@/constants/theme";
import { useCachedAvatarUri } from "@/utils/avatar";

interface Props {
  name: string;
  avatarUrl?: string | null;
  localPreviewUri?: string | null;
  cacheKey?: string;
  uploading?: boolean;
  onPickFromLibrary: () => Promise<void>;
  onTakePhoto: () => Promise<void>;
  onRemove?: () => Promise<void>;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileAvatar({
  name,
  avatarUrl,
  localPreviewUri,
  cacheKey,
  uploading,
  onPickFromLibrary,
  onTakePhoto,
  onRemove,
}: Props) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const remoteUri = useCachedAvatarUri(avatarUrl, cacheKey);
  const resolvedUrl = localPreviewUri ?? remoteUri;
  const busy = uploading || loadingAction;

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedUrl]);

  const openPicker = () => {
    const options: {
      text: string;
      style?: "cancel" | "destructive" | "default";
      onPress?: () => void;
    }[] = [
      { text: "Annuler", style: "cancel" },
      {
        text: "Galerie",
        onPress: () => {
          setLoadingAction(true);
          onPickFromLibrary().finally(() => setLoadingAction(false));
        },
      },
      {
        text: "Appareil photo",
        onPress: () => {
          setLoadingAction(true);
          onTakePhoto().finally(() => setLoadingAction(false));
        },
      },
    ];

    if (resolvedUrl && onRemove) {
      options.push({
        text: "Supprimer la photo",
        style: "destructive",
        onPress: () => {
          Alert.alert("Supprimer la photo", "Revenir à l'avatar par défaut ?", [
            { text: "Annuler", style: "cancel" },
            {
              text: "Supprimer",
              style: "destructive",
              onPress: () => {
                setLoadingAction(true);
                onRemove().finally(() => setLoadingAction(false));
              },
            },
          ]);
        },
      });
    }

    Alert.alert("Photo de profil", "Choisissez une option", options);
  };

  return (
    <Pressable
      onPress={openPicker}
      disabled={busy}
      style={({ pressed }) => [styles.outer, pressed && !busy && { opacity: 0.92 }]}
    >
      <View style={styles.avatarOuter}>
        {resolvedUrl && !imageFailed ? (
          <Image
            source={{ uri: resolvedUrl }}
            style={styles.photo}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{initialsFromName(name) || "?"}</Text>
            </View>
          </LinearGradient>
        )}
        <View style={styles.onlineDot} />
        <View style={styles.cameraBtn}>
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={16} color="#fff" />
          )}
        </View>
      </View>
      <Text style={styles.hint}>
        Appuyez pour {resolvedUrl ? "modifier" : "ajouter"} votre photo
      </Text>
    </Pressable>
  );
}

export async function requestPhotoPermissions(kind: "library" | "camera") {
  if (kind === "library") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === "granted";
}

export async function pickProfileImage(from: "library" | "camera") {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  };

  if (from === "camera") {
    const cameraResult = await ImagePicker.launchCameraAsync(options);
    if (cameraResult.canceled || !cameraResult.assets[0]) return null;
    return cameraResult.assets[0];
  }

  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

const SIZE = 96;

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    marginBottom: 14,
  },
  avatarOuter: {
    position: "relative",
  },
  avatarRing: {
    padding: 3,
    borderRadius: SIZE / 2 + 3,
  },
  avatarInner: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: SIZE + 6,
    height: SIZE + 6,
    borderRadius: (SIZE + 6) / 2,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
  },
  onlineDot: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.backgroundElevated,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 10,
    fontWeight: "500",
  },
});
