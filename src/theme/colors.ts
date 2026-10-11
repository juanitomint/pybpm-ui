// Central design-token dictionary — the single source of truth for UI colors.
// Layout components must never contain inline hex literals; they reference
// these tokens directly or via the MUI theme built from them (createAppTheme).

/** Core semantic palette. Keys are uniform across both modes. */
export const Colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F8F9FA",
    text: "#1A1A1A",
    textSecondary: "#6C757D",
    primary: "#007AFF",
    border: "#E9ECEF",
    error: "#DC3545",
  },
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#F8F9FA",
    textSecondary: "#A9A9A9",
    primary: "#0A84FF",
    border: "#2C2C2E",
    error: "#FF453A",
  },
} as const;

export type ThemeMode = keyof typeof Colors;

/** Kanban column accents (mode-independent) + per-mode column background tints. */
export const KanbanStatusColors = {
  pending: { accent: "#757575", bgLight: "#f5f5f5", bgDark: "#242424" },
  in_progress: { accent: "#1976d2", bgLight: "#e3f2fd", bgDark: "#0a1b2e" },
  validating: { accent: "#f59e0b", bgLight: "#fff8e1", bgDark: "#2c1e00" },
  done: { accent: "#10b981", bgLight: "#e8f5e9", bgDark: "#071a0e" },
} as const;

export type KanbanStatusKey = keyof typeof KanbanStatusColors;

/** Brand assets (decorative, mode-independent). */
export const Brand = {
  loginGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
} as const;
