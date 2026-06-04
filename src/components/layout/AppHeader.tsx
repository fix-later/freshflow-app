import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';

export interface AppHeaderAction {
  icon: ReactNode;
  onPress: () => void;
}

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: AppHeaderAction[];
  backgroundColor?: string;
  titleColor?: string;
  style?: ViewStyle;
}

export function AppHeader({
  title,
  showBack = false,
  onBack,
  rightActions,
  backgroundColor = Colors.surface,
  titleColor = Colors.textPrimary,
  style,
}: AppHeaderProps) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.container, style]}>
        {/* Left section */}
        <View style={styles.sideSection}>
          {showBack && (
            <Pressable onPress={handleBack} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </Pressable>
          )}
        </View>

        {/* Center title */}
        <View style={styles.centerSection}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right section */}
        <View style={styles.sideSection}>
          {rightActions?.map((action, index) => (
            <Pressable
              key={index}
              onPress={action.onPress}
              hitSlop={8}
              style={styles.actionButton}
            >
              {action.icon}
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default AppHeader;

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: theme.spacing.md,
  },
  sideSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  backButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
});
