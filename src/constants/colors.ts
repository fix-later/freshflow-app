export const Colors = {
  // Primary palette (Tasty Daily inspired)
  primary: '#243F2F',
  primaryLight: '#EFF5EE',
  secondary: '#00AA63',
  accent: '#00D783',

  // Semantic colors
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',

  // Surfaces
  background: '#F7FAFC',
  surface: '#FFFFFF',
  overlay: 'rgba(36, 63, 47, 0.5)',

  // Borders
  border: '#D9E7D6',
  borderDark: '#A0B8A0',

  // Text
  textPrimary: '#212121',
  textSecondary: '#767676',
  textMuted: '#94A3B8',
} as const;

export type ColorKey = keyof typeof Colors;
