import { useColorScheme } from 'react-native';

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
};

export type AppTheme = typeof lightColors;

/** Static light-theme colors, for the rare case a value is needed outside a component (e.g. a module-level constant). Prefer useTheme() inside components. */
export const theme = lightColors;

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
