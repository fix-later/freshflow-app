export const Colors = {
  // Primary palette (mirrors web freshflow brand scale)
  primary: '#50F0A3',
  primary600: '#48D892',
  primaryLight: '#E5FCEE',
  primaryContainer: '#50F0A3',
  // Deep teal keeps normal-size labels accessible on the very light mint fill.
  onPrimary: '#083B4B',
  onPrimaryContainer: '#2B8057',
  primaryText: '#2B8057',

  // Secondary / accent (mirrors web freshflowAccent brand scale)
  secondary: '#313F90',
  secondaryContainer: '#E2E4EB',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1A214D',
  accent: '#313F90',
  accent600: '#2C3881',
  deepTeal: '#083B4B',
  white: '#FFFFFF',

  // Tertiary (status accent, no web brand equivalent)
  tertiary: '#825100',
  tertiaryContainer: '#a36700',

  // Semantic colors
  success: '#48D892',
  successLight: '#E5FCEE',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  error: '#DC2626',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  onErrorContainer: '#7F1D1D',

  // Surfaces (mirrors web slate scale)
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#F1F5F9',
  surfaceContainerHigh: '#E2E8F0',
  surfaceContainerHighest: '#CBD5E1',
  surfaceVariant: '#E2E8F0',

  // Text
  text: '#1E293B',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  onSurface: '#1E293B',
  onSurfaceVariant: '#64748B',

  // Borders
  border: '#E2E8F0',
  borderDark: '#94A3B8',
  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',

  // Overlay
  overlay: 'rgba(8, 59, 75, 0.5)',
} as const;

export type ColorKey = keyof typeof Colors;
