import { createTheme, type Theme } from "@mui/material/styles";
import { Colors, KanbanStatusColors, type ThemeMode } from "./colors";

/**
 * Build a full MUI theme for the given mode from the semantic tokens.
 *
 * Token → MUI palette mapping:
 *   background     → palette.background.default
 *   surface        → palette.background.paper
 *   text           → palette.text.primary      (sx paths "text.primary")
 *   textSecondary  → palette.text.secondary    (sx paths "text.secondary")
 *   primary        → palette.primary.main
 *   error          → palette.error.main
 *   border         → palette.divider           (sx path "divider")
 *   kanban accents → palette.info/warning/success mains
 */
export function createAppTheme(mode: ThemeMode): Theme {
  const c = Colors[mode];
  return createTheme({
    palette: {
      mode,
      background: { default: c.background, paper: c.surface },
      text: { primary: c.text, secondary: c.textSecondary },
      primary: { main: c.primary },
      error: { main: c.error },
      info: { main: KanbanStatusColors.in_progress.accent },
      warning: { main: KanbanStatusColors.validating.accent },
      success: { main: KanbanStatusColors.done.accent },
      divider: c.border,
    },
  });
}

export { Colors, Brand, KanbanStatusColors } from "./colors";
export type { ThemeMode, KanbanStatusKey } from "./colors";
