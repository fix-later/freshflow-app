import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  titleSize?: keyof typeof theme.fontSize;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  titleSize = 'lg',
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: theme.fontSize[titleSize] }]}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default SectionHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  title: {
    fontWeight: theme.fontWeight.bold,
    color: Colors.textPrimary,
  },
  action: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: Colors.secondary,
  },
});
