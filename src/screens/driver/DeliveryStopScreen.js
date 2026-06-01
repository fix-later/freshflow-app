import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { logisticsService } from '../../services/logisticsService';

export default function DeliveryStopScreen({ route, navigation }) {
  const { stop } = route.params;
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async (status) => {
    setLoading(true);
    try {
      await logisticsService.updateDeliveryStatus(stop.deliveryId, status);
      Alert.alert('Thành công', STATUS_SUCCESS_MSG[status], [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.typeLabel}>{STOP_TYPE_LABELS[stop.entityType] ?? stop.entityType}</Text>
        <Text style={styles.name}>{stop.entityName}</Text>
        {stop.estimatedArrivalAt && (
          <Text style={styles.time}>
            Dự kiến đến: {new Date(stop.estimatedArrivalAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Cập nhật trạng thái</Text>

      <TouchableOpacity
        style={[styles.btn, styles.btnArrived, loading && styles.btnDisabled]}
        onPress={() => handleUpdateStatus('ARRIVED')}
        disabled={loading}
      >
        <Text style={styles.btnText}>📍 Đã đến điểm</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnDelivered, loading && styles.btnDisabled]}
        onPress={() => handleUpdateStatus('DELIVERED')}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>✅ Giao hàng thành công</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnFailed, loading && styles.btnDisabled]}
        onPress={() =>
          Alert.alert('Xác nhận', 'Đánh dấu giao hàng thất bại?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xác nhận', style: 'destructive', onPress: () => handleUpdateStatus('FAILED') },
          ])
        }
        disabled={loading}
      >
        <Text style={[styles.btnText, { color: '#ef4444' }]}>❌ Giao hàng thất bại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const STOP_TYPE_LABELS = { market: 'Chợ', hub: 'Hub', restaurant: 'Nhà hàng' };
const STATUS_SUCCESS_MSG = {
  ARRIVED: 'Đã ghi nhận bạn đến điểm giao',
  DELIVERED: 'Giao hàng thành công!',
  FAILED: 'Đã ghi nhận giao hàng thất bại',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    marginBottom: 8,
  },
  typeLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 4 },
  time: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  btn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnArrived: { backgroundColor: '#dbeafe' },
  btnDelivered: { backgroundColor: '#16a34a' },
  btnFailed: { backgroundColor: '#fee2e2' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
