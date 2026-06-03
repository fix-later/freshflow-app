import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';

export function SortingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phân loại hàng</Text>
      <Text style={styles.sub}>Gán hàng vào từng đơn hàng tương ứng</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
});
