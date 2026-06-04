import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';

export interface LoadingProps {
  label?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function Loading({ label, size = 'large', fullScreen = false }: LoadingProps) {
  const content = (
    <View style={[styles.content, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return content;
}

export default Loading;

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: Colors.textSecondary,
  },
});
