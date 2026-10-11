"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThemeMode } from "./colors";

/**
 * System-aware light/dark mode hook — replaces next-themes.
 *
 * The pre-paint bootstrap script in `app/layout.tsx` resolves the initial mode
 * (localStorage["theme"] or OS preference) and applies it to <html> before
 * first paint, so this hook only has to keep React state in sync afterwards:
 * - user toggles persist an explicit choice under localStorage "theme"
 *   (same key next-themes used — existing user choices carry over);
 * - while no explicit choice exists, OS `prefers-color-scheme` changes and
 *   storage updates from other tabs are tracked live.
 */

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStored(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** Apply the resolved mode to <html>: CSS class + native color-scheme. */
function apply(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;
}

export function useAppTheme(): {
  mode: ThemeMode;
  toggleTheme: () => void;
} {
  // Hydration convergence: the server always renders light (it has no access to
  // storage), so the first client render MUST match it exactly — adopting the
  // resolved mode earlier fails React hydration on MUI's theme-derived styles.
  const [mode, setMode] = useState<ThemeMode>("light");

  // Track OS preference changes (only while following the system) and
  // explicit choices made in other tabs.
  useEffect(() => {
    const onSystemChange = (e: MediaQueryListEvent): void => {
      if (readStored() === null) setMode(e.matches ? "dark" : "light");
    };
    const mql = window.matchMedia(DARK_QUERY);
    mql.addEventListener("change", onSystemChange);

    const onStorage = (e: StorageEvent): void => {
      if (e.key !== STORAGE_KEY) return;
      // Other tab set an explicit choice, or cleared back to system-following.
      const stored = readStored();
      setMode(
        stored ??
        (typeof window === "undefined" || !window.matchMedia(DARK_QUERY).matches
          ? "light"
          : "dark"),
      );
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mql.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  // Adopt the mode the pre-paint bootstrap script resolved before first paint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-shot post-hydration convergence to the pre-paint-resolved class; guarded by current value, not a loop hazard
    if (document.documentElement.classList.contains("dark")) setMode("dark");
  }, []);

  // Keep the DOM in sync when state changes (toggle, OS flip, other tab). The
  // initial run is skipped: the pre-paint bootstrap script already applied the
  // correct class + color-scheme to <html>.
  const skippedInitialApply = useRef(false);
  useEffect(() => {
    if (!skippedInitialApply.current) {
      skippedInitialApply.current = true;
      return;
    }
    apply(mode);
  }, [mode]);

  const toggleTheme = useCallback((): void => {
    setMode((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable (private mode etc.) — theme still applies this session
      }
      return next;
    });
  }, []);

  return { mode, toggleTheme };
}
