export const Colors = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  secondary: '#0F766E',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  background: '#F7FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderDark: '#CBD5E0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export type ColorKey = keyof typeof Colors;
