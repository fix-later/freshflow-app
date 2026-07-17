export const Fonts = {
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

export type FontKey = keyof typeof Fonts;
