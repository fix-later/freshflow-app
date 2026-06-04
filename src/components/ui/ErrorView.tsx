import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';
import { Button } from './Button';

export interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorView({
  message = 'Đã có lỗi xảy ra',
  onRetry,
  fullScreen = false,
}: ErrorViewProps) {
  const content = (
    <View style={[styles.content, fullScreen && styles.fullScreen]}>
      <Ionicons name="alert-circle" size={48} color={Colors.danger} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Thử lại"
          variant="secondary"
          size="sm"
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return content;
}

export default ErrorView;

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: theme.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    minWidth: 120,
  },
});
