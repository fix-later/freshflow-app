import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { orderService } from '../../services/orderService';
import { useOrderStore } from '../../store/orderStore';

export default function CreateOrderScreen({ route, navigation }) {
  const { market, product } = route.params;
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const addOrder = useOrderStore((s) => s.addOrder);

  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng hợp lệ');
      return;
    }
    if (qty > (product.availableQuantity ?? product.currentQuantity)) {
      Alert.alert('Lỗi', `Số lượng tối đa: ${product.availableQuantity ?? product.currentQuantity} ${product.unit}`);
      return;
    }

    setLoading(true);
    try {
      const order = await orderService.createOrder({
        items: [{ marketProductId: product.marketProductId, quantity: qty }],
        notes: notes.trim() || undefined,
      });
      addOrder(order);
      Alert.alert('Thành công', 'Đơn hàng đã được tạo', [
        { text: 'OK', onPress: () => navigation.navigate('OrderList') },
      ]);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const msg =
        code === 'INSUFFICIENT_STOCK'
          ? 'Không đủ hàng trong kho'
          : code === 'RESTAURANT_NOT_APPROVED'
          ? 'Tài khoản chưa được phê duyệt'
          : 'Tạo đơn hàng thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Product info */}
      <View style={styles.productCard}>
        <Text style={styles.productName}>{product.productName}</Text>
        <Text style={styles.marketName}>{market.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {product.currentPrice?.toLocaleString('vi-VN')} ₫/{product.unit}
          </Text>
          <Text style={styles.available}>
            Còn: {product.availableQuantity ?? product.currentQuantity} {product.unit}
          </Text>
        </View>
      </View>

      {/* Quantity input */}
      <Text style={styles.label}>Số lượng ({product.unit})</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        placeholder={`Tối đa ${product.availableQuantity ?? product.currentQuantity}`}
        placeholderTextColor="#9ca3af"
      />

      {/* Estimated total */}
      {quantity && parseInt(quantity, 10) > 0 && (
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>Dự tính:</Text>
          <Text style={styles.estimateAmount}>
            {(parseInt(quantity, 10) * product.currentPrice).toLocaleString('vi-VN')} ₫
          </Text>
        </View>
      )}

      {/* Notes */}
      <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Ví dụ: Giao trước 5 giờ sáng"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đặt hàng</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    marginBottom: 8,
  },
  productName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  marketName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  price: { fontSize: 16, fontWeight: '700', color: '#15803d' },
  available: { fontSize: 13, color: '#6b7280' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
  },
  estimateLabel: { fontSize: 14, color: '#374151' },
  estimateAmount: { fontSize: 15, fontWeight: '700', color: '#15803d' },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
