import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { pricingService } from '../../services/pricingService';
import { usePricingStore } from '../../store/pricingStore';

export default function UpdatePriceScreen({ route, navigation }) {
  const { market, product } = route.params;
  const [price, setPrice] = useState(String(product.currentPrice ?? ''));
  const [quantity, setQuantity] = useState(String(product.currentQuantity ?? ''));
  const [loading, setLoading] = useState(false);
  const updatePrice = usePricingStore((s) => s.updatePrice);

  const handleUpdate = async () => {
    const newPrice = parseFloat(price);
    const newQty = parseInt(quantity, 10);

    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Lỗi', 'Giá phải là số dương');
      return;
    }
    if (isNaN(newQty) || newQty < 0) {
      Alert.alert('Lỗi', 'Số lượng không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const result = await pricingService.updatePrice(market.id, product.productId, {
        price: newPrice,
        quantity: newQty,
      });

      // Optimistic update in store
      updatePrice(market.id, product.productId, result.currentPrice, result.currentQuantity, result.updatedAt);

      if (result.isSignificantChange) {
        Alert.alert(
          '⚠️ Biến động giá lớn',
          `Giá thay đổi ${result.changePercent?.toFixed(1)}% so với trước`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Thành công', 'Đã cập nhật giá', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const msg =
        code === 'MARKET_ACCESS_DENIED'
          ? 'Bạn không có quyền cập nhật chợ này'
          : code === 'OPTIMISTIC_CONCURRENCY_CONFLICT'
          ? 'Dữ liệu đã thay đổi, vui lòng tải lại'
          : 'Cập nhật thất bại';
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
      </View>

      {/* Price input */}
      <Text style={styles.label}>Giá mới (₫/{product.unit})</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="Nhập giá mới"
        placeholderTextColor="#9ca3af"
        selectTextOnFocus
      />

      {/* Quantity input */}
      <Text style={styles.label}>Số lượng ({product.unit})</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        placeholder="Nhập số lượng"
        placeholderTextColor="#9ca3af"
        selectTextOnFocus
      />

      {/* Previous values */}
      <View style={styles.prevRow}>
        <Text style={styles.prevLabel}>Giá cũ:</Text>
        <Text style={styles.prevValue}>
          {product.currentPrice?.toLocaleString('vi-VN')} ₫
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Cập nhật giá</Text>
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
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  prevRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  prevLabel: { fontSize: 13, color: '#6b7280' },
  prevValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
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
