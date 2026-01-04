// Color palette for the app
export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary/Accent colors
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral/Gray colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Slate (for dark mode backgrounds)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Semantic colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// Theme configurations
export const lightTheme = {
  background: colors.white,
  surface: colors.gray[50],
  surfaceVariant: colors.gray[100],
  text: colors.gray[900],
  textSecondary: colors.gray[600],
  textTertiary: colors.gray[400],
  border: colors.gray[200],
  borderFocused: colors.primary[500],
  primary: colors.primary[600],
  primaryText: colors.white,
  card: colors.white,
  cardBorder: colors.gray[200],
  success: colors.success[600],
  warning: colors.warning[600],
  error: colors.error[600],
  tabBar: colors.white,
  tabBarBorder: colors.gray[200],
  statusBar: 'dark-content' as const,
};

export const darkTheme = {
  background: colors.slate[900],
  surface: colors.slate[800],
  surfaceVariant: colors.slate[700],
  text: colors.slate[50],
  textSecondary: colors.slate[400],
  textTertiary: colors.slate[500],
  border: colors.slate[700],
  borderFocused: colors.primary[400],
  primary: colors.primary[500],
  primaryText: colors.white,
  card: colors.slate[800],
  cardBorder: colors.slate[700],
  success: colors.success[500],
  warning: colors.warning[500],
  error: colors.error[500],
  tabBar: colors.slate[800],
  tabBarBorder: colors.slate[700],
  statusBar: 'light-content' as const,
};

export type Theme = typeof lightTheme;
