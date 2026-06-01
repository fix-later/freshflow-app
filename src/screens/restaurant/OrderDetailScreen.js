import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { orderService } from '../../services/orderService';
import { useOrderStore } from '../../store/orderStore';
import { ORDER_STATUS_LABELS } from '../../constants';
import dayjs from 'dayjs';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  ready_for_pickup: '#06b6d4',
  in_transit: '#f97316',
  delivered: '#16a34a',
  cancelled: '#ef4444',
};

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const setCurrentOrder = useOrderStore((s) => s.setCurrentOrder);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await orderService.getOrder(orderId);
        setCurrentOrder(data);
      } catch (err) {
        console.warn('fetchOrder error', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    return () => setCurrentOrder(null);
  }, [orderId]);

  const handleCancel = () => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc muốn hủy đơn này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await orderService.cancelOrder(orderId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể hủy đơn hàng này');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading || !currentOrder) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const canCancel = ['pending', 'confirmed'].includes(currentOrder.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={styles.statusRow}>
        <Text style={styles.orderId}>#{currentOrder.id.slice(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[currentOrder.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[currentOrder.status] }]}>
            {ORDER_STATUS_LABELS[currentOrder.status] ?? currentOrder.status}
          </Text>
        </View>
      </View>

      {/* Items */}
      <Text style={styles.sectionTitle}>Sản phẩm</Text>
      {currentOrder.items?.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <Text style={styles.itemMarket}>{item.marketName}</Text>
          </View>
          <View style={styles.itemPricing}>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemSubtotal}>
              {item.subtotal?.toLocaleString('vi-VN')} ₫
            </Text>
          </View>
        </View>
      ))}

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Tổng cộng</Text>
        <Text style={styles.totalAmount}>
          {currentOrder.totalAmount?.toLocaleString('vi-VN')} ₫
        </Text>
      </View>

      {/* Meta */}
      <Text style={styles.meta}>
        Đặt lúc: {dayjs(currentOrder.createdAt).format('DD/MM/YYYY HH:mm')}
      </Text>
      {currentOrder.notes ? (
        <Text style={styles.notes}>Ghi chú: {currentOrder.notes}</Text>
      ) : null}

      {/* Cancel button */}
      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
          onPress={handleCancel}
          disabled={cancelling}
        >
          <Text style={styles.cancelBtnText}>
            {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 1,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemMarket: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemPricing: { alignItems: 'flex-end' },
  itemQty: { fontSize: 13, color: '#6b7280' },
  itemSubtotal: { fontSize: 14, fontWeight: '600', color: '#15803d' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  totalAmount: { fontSize: 17, fontWeight: '700', color: '#15803d' },
  meta: { fontSize: 12, color: '#9ca3af' },
  notes: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
  cancelBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  cancelBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
