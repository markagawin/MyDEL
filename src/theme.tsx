import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadThemePreference, saveThemePreference } from './storage';

const lightColors = {
  navy: '#0F2C59',
  navyLight: '#1B3F7A',
  background: '#F4F6FB',
  card: '#FFFFFF',
  border: '#E3E7F0',
  text: '#1A1F36',
  textMuted: '#6B7280',
  danger: '#EF4444',
  success: '#10B981',
  surfaceMuted: '#EAEEF6',
  disabled: '#B7C2D6',
  dangerSurface: '#FCEBEB',
  successSurface: '#E6F7F0',
};

const darkColors = {
  navy: '#5B8DEF',
  navyLight: '#7EA6F2',
  background: '#0F1420',
  card: '#1B2233',
  border: '#2B3448',
  text: '#EDEFF5',
  textMuted: '#98A2B8',
  danger: '#F87171',
  success: '#34D399',
  surfaceMuted: '#141928',
  disabled: '#3A4258',
  dangerSurface: '#3A2020',
  successSurface: '#1A2E24',
};

export type AppTheme = typeof lightColors;
export type ThemePreference = 'system' | 'light' | 'dark';

/** Static light-theme colors, for the rare case a value is needed outside a component (e.g. a module-level constant). Prefer useTheme() inside components. */
export const theme = lightColors;

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    (async () => {
      const stored = await loadThemePreference();
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    })();
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    saveThemePreference(pref);
  };

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isDark ? darkColors : lightColors,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme/useThemePreference must be used within ThemeProvider');
  return ctx;
}

export function useTheme(): AppTheme {
  return useThemeContext().theme;
}

export function useIsDarkTheme(): boolean {
  return useThemeContext().isDark;
}

export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
} {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}
