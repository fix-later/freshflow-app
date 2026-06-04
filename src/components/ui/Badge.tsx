import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles = {
  primary: { bg: Colors.primary, text: '#FFFFFF' },
  success: { bg: Colors.success, text: '#FFFFFF' },
  warning: { bg: Colors.warning, text: '#FFFFFF' },
  danger: { bg: Colors.danger, text: '#FFFFFF' },
  neutral: { bg: '#E2E8F0', text: '#475569' },
} as const;

export function Badge({ label, variant = 'primary', size = 'md' }: BadgeProps) {
  const colors = variantStyles[variant];

  return (
    <View style={[styles.base, styles[`size_${size}`], { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, styles[`labelSize_${size}`], { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

export default Badge;

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_sm: {
    height: 20,
    paddingHorizontal: 6,
  },
  size_md: {
    height: 26,
    paddingHorizontal: 10,
  },
  label: {
    fontWeight: theme.fontWeight.semibold,
  },
  labelSize_sm: {
    fontSize: 10,
    lineHeight: 14,
  },
  labelSize_md: {
    fontSize: 12,
    lineHeight: 16,
  },
});
