import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { theme } from '../../config/theme';

export interface DividerProps {
  color?: string;
  marginVertical?: number;
  thickness?: number;
  style?: ViewStyle;
}

export function Divider({
  color = Colors.border,
  marginVertical = theme.spacing.md,
  thickness = StyleSheet.hairlineWidth,
  style,
}: DividerProps) {
  return (
    <View
      style={[
        styles.divider,
        {
          borderBottomColor: color,
          borderBottomWidth: thickness,
          marginVertical,
        },
        style,
      ]}
    />
  );
}

export default Divider;

const styles = StyleSheet.create({
  divider: {
    width: '100%',
  },
});
