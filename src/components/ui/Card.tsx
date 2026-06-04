import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof theme.spacing;
  onPress?: () => void;
  shadow?: keyof typeof theme.shadow;
}

export function Card({
  children,
  style,
  padding = 'md',
  onPress,
  shadow = 'sm',
}: CardProps) {
  const cardStyle: ViewStyle = {
    ...styles.base,
    padding: theme.spacing[padding],
    ...theme.shadow[shadow],
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

export default Card;

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: theme.radius.lg,
  },
  pressed: {
    opacity: 0.92,
  },
});
