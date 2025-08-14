import { useColorScheme } from 'react-native';

export type Theme = ReturnType<typeof useTheme>;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = isDark
    ? {
        bg: '#0b0b0f',
        surface: '#141420',
        text: '#f2f2f7',
        subtext: '#a0a0b3',
        primary: '#6aa6ff',
        primaryText: '#0b0b0f',
        border: '#2a2a3a',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        muted: '#1a1a26',
        warningText: '#1F2937',
      }
    : {
        bg: '#ffffff',
        surface: '#f7f7fb',
        text: '#111827',
        subtext: '#6b7280',
        primary: '#2563eb',
        primaryText: '#ffffff',
        border: '#e5e7eb',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        muted: '#f1f5f9',
        warningText: '#1F2937',
      };

  const spacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 };
  const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
  const typography = { title: 18, subtitle: 14, body: 14, small: 12 };

  return { isDark, colors, spacing, radius, typography };
}
