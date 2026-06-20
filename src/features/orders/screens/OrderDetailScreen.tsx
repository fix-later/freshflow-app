import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'OrderDetail'>;

export function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chi tiết đơn hàng</Text>
      <Text style={styles.sub}>Mã đơn: #{orderId.toUpperCase()}</Text>
      <Text style={styles.desc}>Trạng thái, chi tiết sản phẩm và nút hủy đơn (Đang phát triển)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.onSurface, marginBottom: 8 },
  sub: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 12 },
  desc: { fontSize: 13, color: Colors.outline, textAlign: 'center' },
});
