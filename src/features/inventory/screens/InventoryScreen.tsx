import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';

export function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tồn kho</Text>
      <Text style={styles.sub}>Theo dõi số lượng hàng, nhập xuất và cảnh báo thiếu hụt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
