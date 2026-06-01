import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { hubService } from '../../services/hubService';

export default function ScanInboundScreen({ route, navigation }) {
  const { hubId } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (!code.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã QR hoặc barcode');
      return;
    }
    setLoading(true);
    try {
      const data = await hubService.scanInbound(hubId, { qrCode: code.trim() });
      setResult(data);
    } catch (err) {
      const code_err = err.response?.data?.error?.code;
      Alert.alert('Lỗi', code_err === 'SCAN_NO_MATCH' ? 'Không tìm thấy lô hàng' : 'Quét thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscrepancy = () => {
    navigation.navigate('Discrepancy', { hubId, inboundId: result?.inboundEventId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Nhập mã QR / Barcode</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="Quét hoặc nhập mã thủ công"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleScan}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Xác nhận nhận hàng</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>✅ Nhận hàng thành công</Text>
          <Text style={styles.resultId}>ID: {result.inboundEventId}</Text>
          {result.expectedItems?.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemQty}>{item.quantityKg} kg</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.discrepancyBtn} onPress={handleDiscrepancy}>
            <Text style={styles.discrepancyBtnText}>⚠️ Báo cáo sai lệch</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  btn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    gap: 8,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#15803d' },
  resultId: { fontSize: 12, color: '#6b7280' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemName: { fontSize: 14, color: '#374151' },
  itemQty: { fontSize: 14, fontWeight: '600', color: '#111827' },
  discrepancyBtn: {
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  discrepancyBtnText: { fontSize: 14, fontWeight: '600', color: '#a16207' },
});
