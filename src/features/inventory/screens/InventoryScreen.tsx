import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Colors } from '../../../constants/colors';

export function InventoryScreen() {
  return (
    <Screen title="Tồn kho" subtitle="Nơi theo dõi số lượng hàng, nhập xuất và cảnh báo thiếu hụt.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Placeholder inventory</Text>
        <Text style={styles.cardText}>
          Đây là chỗ để hiển thị kho, tồn tối thiểu, và trạng thái replenishment sau này.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: Colors.surface,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
});
