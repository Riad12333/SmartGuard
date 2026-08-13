import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { API_URL } from "@/constants/config";

export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  cacheKey?: string,
): string | null {
  if (!avatarUrl) return null;
  const base = avatarUrl.startsWith("http") ? avatarUrl : `${API_URL}${avatarUrl}`;
  if (!cacheKey) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(cacheKey)}`;
}

/** Android bloque souvent le chargement HTTP direct dans `<Image>` (Expo Go). */
export function useCachedAvatarUri(
  avatarUrl: string | null | undefined,
  cacheKey?: string,
): string | null {
  const resolved = resolveAvatarUrl(avatarUrl, cacheKey);
  const [uri, setUri] = useState<string | null>(() => {
    if (!resolved) return null;
    if (Platform.OS === "android" && resolved.startsWith("http://")) return null;
    return resolved;
  });

  useEffect(() => {
    if (!resolved) {
      setUri(null);
      return;
    }

    if (Platform.OS === "android" && resolved.startsWith("http://")) {
      let cancelled = false;
      const safeKey = (cacheKey ?? "avatar").replace(/[^\w.-]/g, "_");
      const dest = `${FileSystem.cacheDirectory}sg_avatar_${safeKey}.jpg`;

      (async () => {
        try {
          const info = await FileSystem.getInfoAsync(dest);
          if (info.exists && !cancelled) {
            setUri(dest);
            return;
          }
          const result = await FileSystem.downloadAsync(resolved, dest);
          if (!cancelled) setUri(result.uri);
        } catch {
          if (!cancelled) setUri(resolved);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    setUri(resolved);
  }, [resolved, cacheKey]);

  return uri;
}
