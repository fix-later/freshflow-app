export const Fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extraBold: 'Montserrat_800ExtraBold',
  // Compatibility alias for consumers that use the all-lowercase suffix.
  extrabold: 'Montserrat_800ExtraBold',

  // Numeric aliases intentionally resolve to Montserrat as the Restaurant UI
  // uses one family consistently across labels, prices, quantities, and IDs.
  mono: 'Montserrat_400Regular',
  monoRegular: 'Montserrat_400Regular',
  monoMedium: 'Montserrat_500Medium',
  monoSemibold: 'Montserrat_600SemiBold',
  monoBold: 'Montserrat_700Bold',
} as const;

export type FontKey = keyof typeof Fonts;
