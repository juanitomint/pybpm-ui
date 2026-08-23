"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Theme context — shared state for dark mode across all consumers
interface ThemeContextValue {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useDarkMode() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // Sync theme preference after hydration — safe because initial render matches SSR.
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') setMode(stored);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  return { mode, toggleTheme };
}

// Hook that reads from shared ThemeContext (throws if called outside provider)
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a Providers component');
  return ctx;
}

// Wraps children with ThemeContext + MUI ThemeProvider so theme updates reactively
function ThemedProviders({ children }: { children: React.ReactNode }) {
  const { mode, toggleTheme } = useDarkMode();
  // useMemo ensures new theme only when mode changes, avoiding unnecessary re-renders
  const muiTheme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
const emotionCache = createCache({ key: 'mui', prepend: true });

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
