"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { createAppTheme } from "../src/theme";
import { useAppTheme } from "../src/theme/useAppTheme";
// Theme context — shared state for dark mode across all consumers.
// Mode resolution (system preference + persistence) is handled by useAppTheme:
// a pre-paint script in app/layout.tsx applies the initial class to <html>,
// and the hook tracks OS `prefers-color-scheme` changes, other-tab storage
// updates, and persists manual choices under localStorage "theme".
interface ThemeContextValue {
  mode: "light" | "dark";
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Hook that reads from shared ThemeContext (throws if called outside provider)
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    throw new Error("useTheme must be used within a Providers component");
  return ctx;
}

// Wraps children with ThemeContext + MUI ThemeProvider so theme
// updates propagate to both CSS (html class) and MUI components.
function ThemedProviders({ children }: { children: React.ReactNode }) {
  const { mode, toggleTheme } = useAppTheme();

  // New MUI theme only when the resolved mode changes — avoids re-render storms.
  const muiTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
const emotionCache = createCache({ key: "mui", prepend: true });

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <CacheProvider value={emotionCache}>
      <QueryClientProvider client={queryClient}>
        <ThemedProviders>{children}</ThemedProviders>
      </QueryClientProvider>
    </CacheProvider>
  );
}
