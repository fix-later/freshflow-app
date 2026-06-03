import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';

export function NavigationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bản đồ điều hướng</Text>
      {/* TODO: replace with react-native-maps after: npx expo install react-native-maps */}
      <Text style={styles.sub}>Bản đồ GPS real-time tới điểm giao</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
});
