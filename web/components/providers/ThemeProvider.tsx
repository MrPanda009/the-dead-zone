'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The configured theme setting: 'light', 'dark', or 'system' */
  theme: Theme;
  /** The actively resolved theme applied to the document ('light' or 'dark') */
  resolvedTheme: ResolvedTheme;
  /** Update the active theme setting */
  setTheme: (theme: Theme) => void;
  /** Convenience toggle: alternates between light and dark */
  toggleTheme: () => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme if none is stored in localStorage. Defaults to 'dark' */
  defaultTheme?: Theme;
  /** Storage key for persisting theme preference in localStorage */
  storageKey?: string;
  /** Attribute name to apply on the root element (defaults to 'class') */
  attribute?: 'class' | 'data-theme';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const SYSTEM_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia(SYSTEM_MEDIA_QUERY);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSystemSnapshot(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia(SYSTEM_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function getServerSystemSnapshot(): ResolvedTheme {
  return 'dark';
}

const emptySubscribe = () => () => {};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
  storageKey = 'setu-drr-theme',
}) => {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemSnapshot,
    getServerSystemSnapshot
  );

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const saved = localStorage.getItem(storageKey) as Theme | null;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return defaultTheme;
  });

  // Compute resolved theme
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return isMounted ? systemTheme : defaultTheme === 'system' ? 'dark' : defaultTheme;
    }
    return theme;
  }, [theme, systemTheme, isMounted, defaultTheme]);

  // Apply classes and attributes to documentElement whenever resolvedTheme updates
  useEffect(() => {
    if (!isMounted) return;
    const root = document.documentElement;

    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, isMounted]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore quota/security errors
      }
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Access the global theme state and controls.
 * Must be used within a <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
