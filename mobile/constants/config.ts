import Constants from "expo-constants";

import { COLORS as THEME_COLORS } from "./theme";

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://localhost:8000";

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ?? extra.wsUrl ?? "ws://localhost:8000";

export const COLORS = THEME_COLORS;
