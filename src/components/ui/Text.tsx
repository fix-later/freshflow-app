import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { Fonts } from '../../constants/fonts';

type SupportedFontWeight = '400' | '500' | '600' | '700' | '800';

export type BrandFontWeight =
  | SupportedFontWeight
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 400
  | 500
  | 600
  | 700
  | 800;

type BrandTypographyProps = {
  /** Explicit weight override. A fontWeight in style is used when omitted. */
  weight?: BrandFontWeight;
  /** Use IBM Plex Mono for prices, quantities, identifiers, and other numeric data. */
  numeric?: boolean;
};

export type BrandTextProps = TextProps & BrandTypographyProps;
export type BrandTextInputProps = TextInputProps & BrandTypographyProps;

const GOOGLE_SANS_BY_WEIGHT: Record<SupportedFontWeight, string> = {
  '400': Fonts.regular,
  '500': Fonts.medium,
  '600': Fonts.semibold,
  '700': Fonts.bold,
  '800': Fonts.extrabold,
};

const IBM_PLEX_MONO_BY_WEIGHT: Record<SupportedFontWeight, string> = {
  '400': Fonts.monoRegular,
  '500': Fonts.monoMedium,
  '600': Fonts.monoSemibold,
  '700': Fonts.monoBold,
  // IBM Plex Mono has no 800 face in the installed package; use its bold face.
  '800': Fonts.monoBold,
};

const NAMED_WEIGHTS: Record<string, SupportedFontWeight> = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

function weightFromFontFamily(fontFamily: TextStyle['fontFamily']): SupportedFontWeight | undefined {
  if (!fontFamily) return undefined;

  const normalized = fontFamily.toLowerCase();
  if (normalized.includes('extrabold') || normalized.includes('800')) return '800';
  if (normalized.includes('bold') || normalized.includes('700')) return '700';
  if (normalized.includes('semibold') || normalized.includes('600')) return '600';
  if (normalized.includes('medium') || normalized.includes('500')) return '500';
  if (normalized.includes('regular') || normalized.includes('400')) return '400';
  return undefined;
}

function normalizeWeight(weight: BrandFontWeight | TextStyle['fontWeight']): SupportedFontWeight {
  if (weight == null) return '400';

  const normalized = String(weight).toLowerCase();
  if (normalized in NAMED_WEIGHTS) return NAMED_WEIGHTS[normalized];

  const numericWeight = Number.parseInt(normalized, 10);
  if (numericWeight >= 800) return '800';
  if (numericWeight >= 700) return '700';
  if (numericWeight >= 600) return '600';
  if (numericWeight >= 500) return '500';
  return '400';
}

function resolveTypographyStyle(
  style: TextProps['style'] | TextInputProps['style'],
  weight: BrandFontWeight | undefined,
  numeric: boolean,
): TextStyle {
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const resolvedWeight = normalizeWeight(
    weight ?? flattenedStyle?.fontWeight ?? weightFromFontFamily(flattenedStyle?.fontFamily),
  );
  const resolvedNumeric =
    numeric || flattenedStyle?.fontFamily?.toLowerCase().includes('ibmplexmono') === true;

  return {
    fontFamily: resolvedNumeric
      ? IBM_PLEX_MONO_BY_WEIGHT[resolvedWeight]
      : GOOGLE_SANS_BY_WEIGHT[resolvedWeight],
    // The selected font asset already carries the requested weight. Resetting
    // this prevents Android from trying to synthesize another font face.
    fontWeight: 'normal',
  };
}

export function BrandText({ style, weight, numeric = false, ...props }: BrandTextProps) {
  return <Text {...props} style={[style, resolveTypographyStyle(style, weight, numeric)]} />;
}

export function BrandTextInput({
  style,
  weight,
  numeric = false,
  ...props
}: BrandTextInputProps) {
  return <TextInput {...props} style={[style, resolveTypographyStyle(style, weight, numeric)]} />;
}

export { BrandText as Text, BrandTextInput as TextInput };
