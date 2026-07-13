import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { orderApi } from '../api/orderApi';
import { useCartStore } from '../../../store/cartStore';
import { type RestaurantOrdersStackParamList, type CreateOrderItem } from '../../../navigation/types';
import { creditApi } from '../../credit/api/creditApi';
import { restaurantApi } from '../../restaurant/api/restaurantApi';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ConfirmOrder'>;

// ─── Cutoff info (mock — replace with API when BE ready) ───────────────
const CUTOFF_HOUR = 22;

const DELIVERY_CYCLE_ROWS = [
  { days: 'Thứ 2 – Thứ 7', window: '5:00 – 8:00 sáng', note: 'Đặt trước 22:00 hôm trước' },
  { days: 'Chủ nhật', window: 'Không giao', note: '—' },
];

function getCutoffInfo() {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  const diff = cutoff.getTime() - now.getTime();
  const next = new Date(now);
  next.setDate(now.getDate() + (diff <= 0 ? 2 : 1));
  const nextLabel = `${next.getDate()}/${next.getMonth() + 1}`;
  if (diff <= 0) return { isPast: true, isSafe: false, hoursLeft: 0, minutesLeft: 0, nextLabel };
  const hoursLeft = Math.floor(diff / 3_600_000);
  const minutesLeft = Math.floor((diff % 3_600_000) / 60_000);
  return { isPast: false, isSafe: diff > 2 * 3_600_000, hoursLeft, minutesLeft, nextLabel };
}

function CreditAlertBanner({ ratio, available }: { ratio: number; available: number }) {
  if (ratio < 0.7) return null;
  const isDanger = ratio >= 0.9;
  const accent = isDanger ? '#EF4444' : '#F59E0B';
  const bg = isDanger ? '#FEE2E2' : '#FEF3C7';
  const icon: React.ComponentProps<typeof Ionicons>['name'] = isDanger ? 'warning' : 'alert-circle';
  const title = isDanger
    ? 'Hạn mức tín dụng gần cạn!'
    : `Đã dùng ${Math.round(ratio * 100)}% hạn mức tín dụng`;
  return (
    <View style={[styles.alertBanner, { backgroundColor: bg, borderColor: accent + '50' }]}>
      <Ionicons name={icon} size={20} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertBannerTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.alertBannerSub}>
          Còn {available.toLocaleString('vi-VN')}đ khả dụng. Liên hệ FreshFlow để nâng hạn mức.
        </Text>
      </View>
    </View>
  );
}

function CutoffBanner() {
  const { isPast, isSafe, hoursLeft, minutesLeft, nextLabel } = getCutoffInfo();
  const accent = isPast ? '#EF4444' : isSafe ? '#10B981' : '#F59E0B';
  const bg = isPast ? '#FEE2E2' : isSafe ? '#ECFDF5' : '#FEF3C7';
  const icon = isPast ? 'alert-circle' : isSafe ? 'checkmark-circle' : 'time';
  const title = isPast
    ? 'Đã qua cutoff hôm nay'
    : isSafe
      ? 'Kịp cutoff hôm nay'
      : `Còn ${hoursLeft}g ${minutesLeft}p để đặt`;
  const sub = isPast
    ? `Đơn sẽ giao sáng ngày ${nextLabel} lúc 5:00`
    : `Đặt trước 22:00 → giao sáng ${nextLabel} lúc 5:00`;

  return (
    <View style={[styles.cutoffBanner, { backgroundColor: bg, borderColor: accent + '50' }]}>
      <Ionicons name={icon as any} size={22} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cutoffTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.cutoffSub}>{sub}</Text>
      </View>
    </View>
  );
}

function SuccessView({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  return (
    <View style={styles.successWrap}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={40} color={Colors.onPrimary} />
      </View>
      <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
      <Text style={styles.successSub}>Mã đơn: {orderId.slice(0, 8).toUpperCase()}</Text>
      <Text style={styles.successDesc}>Đơn hàng của bạn đang chờ xác nhận từ hệ thống.</Text>
      <Pressable style={styles.successBtn} onPress={onDone}>
        <Text style={styles.successBtnText}>Về trang chủ</Text>
      </Pressable>
    </View>
  );
}

function ItemRow({ item }: { item: CreateOrderItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemMainRow}>
        <Image source={{ uri: item.image }} style={styles.itemImg} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
          <Text style={styles.itemMeta}>{item.marketName} • {item.unit}</Text>
          <Text style={styles.itemPrice}>{(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={styles.itemQtyWrap}>
          <Text style={styles.itemQtyLabel}>SL</Text>
          <Text style={styles.itemQty}>{item.quantity}</Text>
        </View>
      </View>
      {item.note ? (
        <View style={styles.itemNoteWrap}>
          <Ionicons name="chatbubble-ellipses-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.itemNote}>{item.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ConfirmOrderScreen({ route, navigation }: Props) {
  const { items, scheduledFor, deliveryLabel, notes } = route.params;
  const [loading, setLoading] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [creditRatio, setCreditRatio] = useState<number | null>(null);
  const [availableCredit, setAvailableCredit] = useState<number>(0);
  const { clearCart } = useCartStore();

  useEffect(() => {
    (async () => {
      try {
        const status = await restaurantApi.getApprovalStatus();
        const credit = await creditApi.getCredit(status.restaurantId);
        const ratio = credit.creditLimit > 0 ? credit.usedCredit / credit.creditLimit : 1;
        setCreditRatio(ratio);
        setAvailableCredit(credit.availableCredit ?? 0);
      } catch {
        // non-critical — silent fail
      }
    })();
  }, []);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const draft = await orderApi.create({
        items: items.map(it => ({ marketProductId: it.marketProductId, quantity: it.quantity, note: it.note })),
        scheduledFor,
        notes,
      });
      const draftId = draft?.orderId;
      if (!draftId) throw new Error('Không nhận được mã đơn hàng từ server.');

      await orderApi.confirm(draftId);

      clearCart();
      setPlacedOrderId(draftId);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (code === 'INSUFFICIENT_STOCK') {
        Alert.alert('Không đủ hàng', message ?? 'Một hoặc nhiều sản phẩm không đủ số lượng tồn kho.');
      } else if (code === 'RESTAURANT_NOT_APPROVED') {
        Alert.alert('Tài khoản chưa được duyệt', 'Nhà hàng cần được Admin phê duyệt trước khi đặt hàng.');
      } else if (code === 'SCHEDULED_FOR_TOO_SOON') {
        Alert.alert('Thời gian không hợp lệ', 'Thời gian giao phải cách thời điểm hiện tại ít nhất 2 giờ.');
      } else if (
        code === 'CREDIT_LIMIT_EXCEEDED' ||
        code === 'INSUFFICIENT_CREDIT' ||
        (message ?? '').toLowerCase().includes('credit')
      ) {
        Alert.alert(
          'Hạn mức tín dụng không đủ',
          'Đơn hàng vượt quá hạn mức tín dụng hiện tại của nhà hàng. Vui lòng liên hệ FreshFlow để được cấp hạn mức.',
        );
      } else {
        Alert.alert('Không thể đặt hàng', message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (placedOrderId) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <SuccessView orderId={placedOrderId} onDone={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Cutoff banner ── */}
        <CutoffBanner />

        {/* ── Credit alert ── */}
        {creditRatio !== null && (
          <CreditAlertBanner ratio={creditRatio} available={availableCredit} />
        )}

        {/* ── Delivery cycle ── */}
        <Text style={styles.sectionTitle}>Chu kỳ giao hàng</Text>
        <View style={styles.card}>
          {DELIVERY_CYCLE_ROWS.map((row, i) => (
            <View
              key={i}
              style={[styles.cycleRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.surfaceVariant }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cycleDays}>{row.days}</Text>
                <Text style={styles.cycleNote}>{row.note}</Text>
              </View>
              <Text style={styles.cycleWindow}>{row.window}</Text>
            </View>
          ))}
        </View>

        {/* ── Items ── */}
        <Text style={styles.sectionTitle}>Sản phẩm ({itemCount} sản phẩm)</Text>
        <View style={styles.card}>
          <FlatList
            data={items}
            keyExtractor={it => it.marketProductId}
            renderItem={({ item }) => <ItemRow item={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        {/* ── Delivery time ── */}
        <Text style={styles.sectionTitle}>Thời gian giao hàng</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>{deliveryLabel}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {notes ? (
          <>
            <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>{notes}</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Summary ── */}
        <Text style={styles.sectionTitle}>Tóm tắt</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>{subtotal.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryNote}>Sẽ xác nhận sau</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Giá trị đơn hàng</Text>
            <Text style={styles.summaryTotalValue}>{subtotal.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Tổng tạm tính</Text>
          <Text style={styles.footerTotal}>{subtotal.toLocaleString('vi-VN')}đ</Text>
        </View>
        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.onPrimary} size="small" />
            : <Text style={styles.submitBtnText}>Đặt hàng</Text>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16 },
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

  // Credit alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  alertBannerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  alertBannerSub: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },

  // Cutoff banner
  cutoffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  cutoffTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cutoffSub: { fontSize: 12, color: Colors.textMuted },

  // Delivery cycle
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  cycleDays: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  cycleNote: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cycleWindow: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Items
  itemRow: { flexDirection: 'column', padding: 12, gap: 8 },
  itemMainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemNoteWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 2 },
  itemNote: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', flex: 1 },
  itemImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.surfaceVariant },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, marginBottom: 2 },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  itemQtyWrap: { alignItems: 'center', minWidth: 36 },
  itemQtyLabel: { fontSize: 10, color: Colors.textMuted },
  itemQty: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },

  // Info rows (delivery time, notes display)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: { fontSize: 14, color: Colors.onSurface, flex: 1, lineHeight: 20 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  summaryNote: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  summaryDivider: { height: 1, backgroundColor: Colors.surfaceVariant, marginHorizontal: 14 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  summaryTotalValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  footerLabel: { fontSize: 12, color: Colors.textMuted },
  footerTotal: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 110,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: Colors.onSurface, marginBottom: 6 },
  successSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  successDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  successBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  successBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
