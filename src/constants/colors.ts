export const Colors = {
  // Primary palette (Material Design 3)
  primary: '#006b2c',
  primaryLight: '#f7fff2',
  primaryContainer: '#00873a',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#f7fff2',
  primaryFixed: '#7ffc97',
  primaryFixedDim: '#62df7d',
  inversePrimary: '#62df7d',

  // Secondary
  secondary: '#006399',
  secondaryContainer: '#7bc2ff',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#004f7b',

  // Tertiary
  tertiary: '#825100',
  tertiaryContainer: '#a36700',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#fffbff',

  // Semantic colors
  success: '#006b2c',
  successLight: '#f7fff2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#ba1a1a',
  dangerLight: '#ffdad6',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Surfaces
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceDim: '#d0dbed',
  surfaceBright: '#f8f9ff',
  surfaceVariant: '#d9e3f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff',
  surfaceContainerHigh: '#dee9fc',
  surfaceContainerHighest: '#d9e3f6',
  inverseSurface: '#27313f',
  onInverseSurface: '#eaf1ff',
  overlay: 'rgba(0, 107, 44, 0.5)',

  // Borders
  border: '#bdcaba',
  borderDark: '#6e7b6c',
  outline: '#6e7b6c',
  outlineVariant: '#bdcaba',

  // Text
  textPrimary: '#121c2a',
  textSecondary: '#3e4a3d',
  textMuted: '#6e7b6c',
  onSurface: '#121c2a',
  onSurfaceVariant: '#3e4a3d',

  // Accent
  accent: '#00873a',
} as const;

export type ColorKey = keyof typeof Colors;
