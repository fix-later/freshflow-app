import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';

export function UpdatePriceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cập nhật giá</Text>
      <Text style={styles.sub}>Kiosk Staff nhập giá tại điểm thu mua</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
});
