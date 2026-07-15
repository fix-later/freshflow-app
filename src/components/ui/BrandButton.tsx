import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

export type BrandButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type BrandButtonSize = 'sm' | 'md' | 'lg';

export interface BrandButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: BrandButtonVariant;
  size?: BrandButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function BrandButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  ...rest
}: BrandButtonProps) {
  const spinnerColor =
    variant === 'danger'
      ? Colors.onError
      : variant === 'primary'
        ? Colors.onPrimary
        : Colors.primaryText;

  return (
    <Pressable
      style={({ pressed }) =>
        [
          styles.base,
          styles[`variant_${variant}`],
          styles[`size_${size}`],
          fullWidth && styles.fullWidth,
          pressed && !disabled && !loading && styles[`pressed_${variant}`],
          (disabled || loading) && styles.disabled,
          style,
        ].filter(Boolean) as ViewStyle[]
      }
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default BrandButton;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.48,
  },

  variant_primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  variant_secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  pressed_primary: {
    backgroundColor: Colors.primary600,
    elevation: 1,
  },
  pressed_secondary: {
    backgroundColor: Colors.primaryLight,
  },
  pressed_ghost: {
    backgroundColor: Colors.primaryLight,
  },
  pressed_danger: {
    backgroundColor: Colors.onErrorContainer,
    elevation: 1,
  },

  size_sm: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  size_md: {
    height: 48,
    paddingHorizontal: 24,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: 32,
  },

  text: {
    fontFamily: Fonts.semibold,
    fontWeight: 'normal',
  },
  text_primary: {
    color: Colors.onPrimary,
  },
  text_secondary: {
    color: Colors.primaryText,
  },
  text_ghost: {
    color: Colors.primaryText,
  },
  text_danger: {
    color: Colors.onError,
  },
  textSize_sm: {
    fontSize: 14,
  },
  textSize_md: {
    fontSize: 16,
  },
  textSize_lg: {
    fontSize: 18,
  },
});
