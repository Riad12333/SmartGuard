export const COLORS = {
  background: "#060b14",
  backgroundElevated: "#0c1424",
  surface: "#131f35",
  surfaceHover: "#1a2844",
  surfaceGlass: "rgba(19, 31, 53, 0.85)",
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  primaryGlow: "rgba(59, 130, 246, 0.25)",
  accent: "#06b6d4",
  accentGlow: "rgba(6, 182, 212, 0.2)",
  success: "#22c55e",
  successGlow: "rgba(34, 197, 94, 0.2)",
  warning: "#f59e0b",
  warningGlow: "rgba(245, 158, 11, 0.2)",
  danger: "#ef4444",
  dangerGlow: "rgba(239, 68, 68, 0.2)",
  text: "#f1f5f9",
  textSecondary: "#cbd5e1",
  textMuted: "#64748b",
  border: "rgba(148, 163, 184, 0.15)",
  borderLight: "rgba(148, 163, 184, 0.08)",
  gradientStart: "#1e3a5f",
  gradientEnd: "#0f172a",
  mapRoad: "#1e293b",
  mapHighway: "#2563eb",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FONT = {
  title: { fontSize: 28, fontWeight: "800" as const },
  heading: { fontSize: 20, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.8 },
};

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
