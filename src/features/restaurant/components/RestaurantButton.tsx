import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { RestaurantColors, RestaurantFonts } from '../theme';

export type RestaurantButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type RestaurantButtonSize = 'sm' | 'md' | 'lg';

export interface RestaurantButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: RestaurantButtonVariant;
  size?: RestaurantButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

// Drop-in type aliases for callers migrating from the shared Button component.
export type ButtonVariant = RestaurantButtonVariant;
export type ButtonSize = RestaurantButtonSize;
export type ButtonProps = RestaurantButtonProps;

export function RestaurantButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  ...rest
}: RestaurantButtonProps) {
  const spinnerColor =
    variant === 'danger'
      ? RestaurantColors.onError
      : variant === 'primary'
        ? RestaurantColors.onPrimary
        : RestaurantColors.primaryText;

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

export default RestaurantButton;

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
    backgroundColor: RestaurantColors.primary,
    shadowColor: RestaurantColors.deepTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  variant_secondary: {
    backgroundColor: RestaurantColors.surface,
    borderWidth: 1.5,
    borderColor: RestaurantColors.primary600,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: RestaurantColors.danger,
    shadowColor: RestaurantColors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  pressed_primary: {
    backgroundColor: RestaurantColors.primary600,
    elevation: 1,
  },
  pressed_secondary: {
    backgroundColor: RestaurantColors.primaryLight,
  },
  pressed_ghost: {
    backgroundColor: RestaurantColors.primaryLight,
  },
  pressed_danger: {
    backgroundColor: RestaurantColors.onErrorContainer,
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
    fontFamily: RestaurantFonts.semibold,
    fontWeight: 'normal',
  },
  text_primary: {
    color: RestaurantColors.onPrimary,
  },
  text_secondary: {
    color: RestaurantColors.primaryText,
  },
  text_ghost: {
    color: RestaurantColors.primaryText,
  },
  text_danger: {
    color: RestaurantColors.onError,
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
