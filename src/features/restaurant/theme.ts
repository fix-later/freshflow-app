import { Colors as BaseColors } from '../../constants/colors';

/**
 * Restaurant storefront palette mirrored from the web runtime theme.
 *
 * BaseColors is intentionally spread first so restaurant screens can migrate
 * incrementally without losing any of the legacy semantic color keys.
 */
export const RestaurantColors = {
  ...BaseColors,

  primary: '#50F0A3',
  primary600: '#48D892',
  primaryLight: '#E5FCEE',
  primaryContainer: '#50F0A3',
  // Deep teal keeps normal-size labels accessible on the very light mint fill.
  onPrimary: '#083B4B',
  onPrimaryContainer: '#2B8057',
  primaryText: '#2B8057',

  secondary: '#313F90',
  secondaryContainer: '#E2E4EB',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1A214D',
  accent: '#313F90',
  accent600: '#2C3881',
  deepTeal: '#083B4B',
  white: '#FFFFFF',

  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#F1F5F9',
  surfaceContainerHigh: '#E2E8F0',
  surfaceContainerHighest: '#CBD5E1',
  surfaceVariant: '#E2E8F0',

  text: '#1E293B',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  onSurface: '#1E293B',
  onSurfaceVariant: '#64748B',

  border: '#E2E8F0',
  borderDark: '#94A3B8',
  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',
  overlay: 'rgba(8, 59, 75, 0.5)',
} as const;

export const RestaurantFonts = {
  regular: 'GoogleSansFlex_400Regular',
  medium: 'GoogleSansFlex_500Medium',
  semibold: 'GoogleSansFlex_600SemiBold',
  bold: 'GoogleSansFlex_700Bold',
  extraBold: 'GoogleSansFlex_800ExtraBold',
  // Compatibility alias for consumers that use the all-lowercase suffix.
  extrabold: 'GoogleSansFlex_800ExtraBold',

  mono: 'IBMPlexMono_400Regular',
  monoRegular: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
} as const;

export type RestaurantColorKey = keyof typeof RestaurantColors;
export type RestaurantFontKey = keyof typeof RestaurantFonts;
