import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  invoiceApi,
  INVOICE_STATUS_LABEL,
  type InvoiceDto,
  type InvoiceStatus,
} from '../api/invoiceApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'InvoiceDetail'>;

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  Draft: Colors.textMuted,
  PendingIssuance: Colors.warning,
  Issued: Colors.success,
  Failed: Colors.danger,
  Adjusted: Colors.textMuted,
  Cancelled: Colors.danger,
};

const STATUS_HINT: Partial<Record<InvoiceStatus, string>> = {
  Draft: 'Hóa đơn đang được khởi tạo, chưa gửi tới cơ quan thuế.',
  PendingIssuance:
    'Đang chờ phát hành. Nếu hồ sơ thuế của nhà hàng chưa đầy đủ (mã số thuế, tên pháp lý, địa chỉ), hệ thống sẽ không thể phát hành — vui lòng kiểm tra ở mục "Hồ sơ thuế".',
  Failed: 'Phát hành thất bại sau nhiều lần thử. Vui lòng liên hệ FreshFlow để được hỗ trợ.',
};

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function InvoiceDetailScreen({ route }: Props) {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoiceApi.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch {
      setError('Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy hóa đơn.'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusHint = STATUS_HINT[invoice.status];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── Header ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invoiceNumber}>{invoice.number ?? 'Chưa cấp số'}</Text>
              {invoice.serial && <Text style={styles.serial}>Ký hiệu: {invoice.serial}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[invoice.status] + '22' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[invoice.status] }]}>
                {INVOICE_STATUS_LABEL[invoice.status]}
              </Text>
            </View>
          </View>
          {statusHint && (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.hintText}>{statusHint}</Text>
            </View>
          )}
          <View style={styles.separator} />
          <Row label="Ngày tạo" value={formatDate(invoice.createdAt)} />
          <Row label="Ngày phát hành" value={formatDate(invoice.issuedAt)} />
          {invoice.taxAuthorityCode && <Row label="Mã cơ quan thuế" value={invoice.taxAuthorityCode} />}

          {invoice.lookupUrl && (
            <Pressable
              style={styles.lookupBtn}
              onPress={() => Linking.openURL(invoice.lookupUrl!).catch(() => {})}
            >
              <Ionicons name="open-outline" size={16} color={Colors.primaryText} />
              <Text style={styles.lookupBtnText}>Tra cứu trên cổng thuế</Text>
            </Pressable>
          )}
        </View>

        {/* ─── Buyer info ─────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>Thông tin người mua</Text>
          <Row label="Mã số thuế" value={invoice.buyerTaxCode || '—'} />
          <Row label="Tên pháp lý" value={invoice.buyerLegalName || '—'} />
          <Row label="Địa chỉ" value={invoice.buyerAddress || '—'} />
          <Row label="Email" value={invoice.buyerEmail || '—'} />
        </View>

        {/* ─── Lines ──────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>Chi tiết hàng hóa</Text>
          {invoice.lines.map((line, index) => (
            <View key={`${line.productName}-${index}`} style={styles.lineItem}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineName} numberOfLines={2}>{line.productName}</Text>
                <Text style={styles.lineTotal}>{formatVnd(line.lineTotal)}</Text>
              </View>
              <Text style={styles.lineSub}>
                {line.quantity} x {formatVnd(line.unitPrice)} · VAT {line.vatRateCode} ({line.vatRatePercent}%)
              </Text>
              {index < invoice.lines.length - 1 && <View style={styles.lineSeparator} />}
            </View>
          ))}
        </View>

        {/* ─── Totals ─────────────────────────── */}
        <View style={styles.card}>
          <Row label="Tạm tính" value={formatVnd(invoice.subTotal)} />
          <Row label="Thuế VAT" value={formatVnd(invoice.vatAmount)} />
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVnd(invoice.total)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.textMuted },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  content: { padding: 16, gap: 16, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardSection: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  invoiceNumber: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  serial: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  hintBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  hintText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginVertical: 10 },

  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 6, gap: 8 },
  rowLabel: { fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },

  lookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  lookupBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primaryText },

  lineItem: { paddingVertical: 8 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  lineTotal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  lineSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lineSeparator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginTop: 10 },

  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.primaryText },
});
