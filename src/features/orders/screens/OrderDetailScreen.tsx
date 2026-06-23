import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import {
  orderApi,
  type OrderDto,
  type OrderItemDto,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
} from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'OrderDetail'>;

// No product image API yet — reuse the same deterministic placeholder set as the catalog screens.
const PRODUCT_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1607301405390-d831c242f59f?w=200',
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200',
  'https://images.unsplash.com/photo-1582972236019-ea4af5ffe587?w=200',
  'https://images.unsplash.com/photo-1566385101042-1a0f0b3c7b0b?w=200',
  'https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=200',
  'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?w=200',
  'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=200',
  'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=200',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200',
];

function productImage(index: number): string {
  return PRODUCT_PLACEHOLDERS[index % PRODUCT_PLACEHOLDERS.length];
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()} • ${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function ItemRow({ item, index }: { item: OrderItemDto; index: number }) {
  const quantity = item.quantity ?? 0;
  const unitPrice = item.unitPrice ?? 0;
  const subtotal = item.subtotal ?? unitPrice * quantity;
  return (
    <View style={styles.itemRow}>
      <Image source={{ uri: productImage(index) }} style={styles.itemImg} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.productNameSnapshot || 'Sản phẩm'}</Text>
        <Text style={styles.itemUnitPrice}>{unitPrice.toLocaleString('vi-VN')}đ x {quantity}</Text>
      </View>
      <Text style={styles.itemSubtotal}>{subtotal.toLocaleString('vi-VN')}đ</Text>
    </View>
  );
}

export function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setError(null);
    try {
      const data = await orderApi.getById(orderId);
      setOrder(data);
    } catch {
      setError('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy đơn hàng'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrder(); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = ORDER_STATUS_LABEL[order.status] || order.status;
  const statusColor = ORDER_STATUS_COLOR[order.status] || Colors.outline;
  const code = (order.orderId || '').slice(0, 8).toUpperCase() || 'N/A';
  const items = order.items ?? [];
  const itemCount = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Status header ── */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
              <Text style={styles.orderCode}>Đơn #{code}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + '12', borderColor: statusColor + '25' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>Đặt lúc {formatDateTime(order.createdAt)}</Text>
          </View>
          {order.scheduledFor ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>Hẹn giao {formatDateTime(order.scheduledFor)}</Text>
            </View>
          ) : null}
          {order.status === 'cancelled' && order.cancellationReason ? (
            <View style={styles.cancelInfoBox}>
              <Ionicons name="close-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.cancelInfoText}>{order.cancellationReason}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Items ── */}
        <Text style={styles.sectionTitle}>Sản phẩm ({itemCount} sản phẩm)</Text>
        <View style={styles.card}>
          <FlatList
            data={items}
            keyExtractor={(it, index) => it.orderItemId ?? it.marketProductId ?? String(index)}
            renderItem={({ item, index }) => <ItemRow item={item} index={index} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        {/* ── Notes ── */}
        {order.notes ? (
          <>
            <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>{order.notes}</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Summary ── */}
        <Text style={styles.sectionTitle}>Tóm tắt</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Tổng tiền</Text>
            <Text style={styles.summaryTotalValue}>{(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.outline, fontWeight: '500' },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: Colors.surfaceVariant, marginHorizontal: 12 },

  // Status header
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderCode: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  metaText: { fontSize: 12, color: Colors.textMuted },
  cancelInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    borderRadius: 8,
  },
  cancelInfoText: { flex: 1, fontSize: 12, color: Colors.error, lineHeight: 16 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  itemImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.surfaceVariant },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, marginBottom: 4 },
  itemUnitPrice: { fontSize: 12, color: Colors.textSecondary },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Info rows (notes)
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { fontSize: 14, color: Colors.onSurface, flex: 1, lineHeight: 20 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  summaryTotalValue: { fontSize: 17, fontWeight: '800', color: Colors.primary },
});
