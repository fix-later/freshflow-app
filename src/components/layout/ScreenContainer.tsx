import { type ReactNode } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  bgColor?: string;
  padding?: boolean;
  safeArea?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  scroll = false,
  bgColor = Colors.background,
  padding = true,
  safeArea = true,
  edges = ['top'],
  style,
}: ScreenContainerProps) {
  const contentStyle: ViewStyle[] = [
    { flex: 1, backgroundColor: bgColor },
    padding && styles.padding,
    style,
  ].filter(Boolean) as ViewStyle[];

  const renderContent = () => {
    if (scroll) {
      return (
        <ScrollView
          style={contentStyle}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      );
    }
    return <View style={contentStyle}>{children}</View>;
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
      {safeArea ? (
        <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: bgColor }]}>
          {renderContent()}
        </SafeAreaView>
      ) : (
        renderContent()
      )}
    </>
  );
}

export default ScreenContainer;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
