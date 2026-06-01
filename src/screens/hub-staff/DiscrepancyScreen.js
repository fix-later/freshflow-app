import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { hubService } from '../../services/hubService';

const CONDITION_OPTIONS = [
  { value: 'MISSING', label: 'Thiếu hàng' },
  { value: 'DAMAGED', label: 'Hàng hỏng' },
  { value: 'PARTIAL', label: 'Thiếu một phần' },
];

export default function DiscrepancyScreen({ route, navigation }) {
  const { hubId, inboundId } = route.params;
  const [orderItemId, setOrderItemId] = useState('');
  const [affectedQty, setAffectedQty] = useState('');
  const [condition, setCondition] = useState('MISSING');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!orderItemId.trim() || !affectedQty) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      await hubService.recordDiscrepancy(hubId, inboundId, {
        orderItemId: orderItemId.trim(),
        affectedQuantity: parseFloat(affectedQty),
        conditionStatus: condition,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Thành công', 'Đã ghi nhận sai lệch. Nhà hàng sẽ được thông báo.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể ghi nhận sai lệch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>⚠️ Báo cáo sai lệch sẽ tự động hoàn tiền cho nhà hàng</Text>
      </View>

      <Text style={styles.label}>Mã sản phẩm (Order Item ID)</Text>
      <TextInput
        style={styles.input}
        value={orderItemId}
        onChangeText={setOrderItemId}
        placeholder="UUID của order item"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Số lượng bị ảnh hưởng (kg)</Text>
      <TextInput
        style={styles.input}
        value={affectedQty}
        onChangeText={setAffectedQty}
        keyboardType="numeric"
        placeholder="0.0"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Tình trạng</Text>
      <View style={styles.conditionRow}>
        {CONDITION_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.conditionBtn, condition === opt.value && styles.conditionBtnActive]}
            onPress={() => setCondition(opt.value)}
          >
            <Text style={[styles.conditionBtnText, condition === opt.value && styles.conditionBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Mô tả chi tiết..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Gửi báo cáo</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  warningBanner: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: { fontSize: 13, color: '#92400e' },
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
  conditionRow: { flexDirection: 'row', gap: 8 },
  conditionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  conditionBtnActive: { backgroundColor: '#fef9c3', borderColor: '#f59e0b' },
  conditionBtnText: { fontSize: 13, color: '#6b7280' },
  conditionBtnTextActive: { color: '#92400e', fontWeight: '600' },
  btn: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
