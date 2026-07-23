import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import { orderApi } from '../api/orderApi';
import { useCartStore } from '../../../store/cartStore';
import { type RestaurantOrdersStackParamList, type CreateOrderItem } from '../../../navigation/types';
import { creditApi } from '../../credit/api/creditApi';
import { restaurantApi } from '../../restaurant/api/restaurantApi';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ConfirmOrder'>;

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

function OrderRuleBanner() {
  return (
    <View style={[styles.cutoffBanner, { backgroundColor: '#ECFDF5', borderColor: '#10B98150' }]}>
      <Ionicons name="shield-checkmark-outline" size={22} color="#10B981" />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cutoffTitle, { color: '#047857' }]}>Kiểm tra trước khi xác nhận</Text>
        <Text style={styles.cutoffSub}>
          Hệ thống sẽ kiểm tra công nợ, trạng thái bản nháp và tự điều chỉnh lịch giao theo cutoff hiện hành.
        </Text>
      </View>
    </View>
  );
}

function SuccessView({
  orderId,
  scheduledFor,
  onDone,
}: {
  orderId: string;
  scheduledFor: string | null;
  onDone: () => void;
}) {
  return (
    <View style={styles.successWrap}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={40} color={Colors.onPrimary} />
      </View>
      <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
      <Text style={styles.successSub}>Mã đơn: {orderId.slice(0, 8).toUpperCase()}</Text>
      <Text style={styles.successDesc}>
        Đơn đã được xác nhận
        {scheduledFor ? ` và dự kiến giao ${new Date(scheduledFor).toLocaleString('vi-VN')}.` : '.'}
      </Text>
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
  const [placedScheduledFor, setPlacedScheduledFor] = useState<string | null>(null);
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [creditRatio, setCreditRatio] = useState<number | null>(null);
  const [availableCredit, setAvailableCredit] = useState<number>(0);
  const { clearCart } = useCartStore();

  useEffect(() => {
    (async () => {
      try {
        const status = await restaurantApi.getApprovalStatus();
        const credit = await creditApi.getCredit(status.restaurantId);
        const ratio = credit.creditLimit > 0
          ? credit.outstandingBalance / credit.creditLimit
          : 1;
        setCreditRatio(ratio);
        setAvailableCredit(credit.availableCredit ?? 0);
      } catch {
        // non-critical — silent fail
      }
    })();
  }, []);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  const openOrderManagement = (orderId: string) => {
    navigation.getParent<any>()?.navigate('RestaurantTracking', {
        screen: 'OrderDetail',
        params: { orderId },
      });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let currentDraftId = draftOrderId;
      if (!currentDraftId) {
        const itemNotes = items
          .filter((item) => item.note?.trim())
          .map((item) => `${item.productName}: ${item.note!.trim()}`);
        const apiNotes = [notes?.trim(), ...itemNotes].filter(Boolean).join('\n') || undefined;
        const draft = await orderApi.create({
          items: items.map(it => ({ marketProductId: it.marketProductId, quantity: it.quantity })),
          scheduledFor,
          notes: apiNotes,
        });
        currentDraftId = draft.orderId;
        setDraftOrderId(currentDraftId);
      }

      const preview = await orderApi.previewConfirmation(currentDraftId);
      if (!preview.wouldSucceed) {
        const issues = preview.issues.map((issue) => `• ${issue.message}`).join('\n');
        Alert.alert(
          'Chưa thể xác nhận đơn',
          `${issues || 'Đơn hàng chưa đáp ứng điều kiện xác nhận.'}\n\nBản nháp đã được lưu trong lịch sử đơn hàng.`,
          [
            {
              text: 'Xem bản nháp',
              onPress: () => openOrderManagement(currentDraftId),
            },
            { text: 'Đóng', style: 'cancel' },
          ],
        );
        return;
      }

      const confirmed = await orderApi.confirm(currentDraftId);

      clearCart();
      setPlacedScheduledFor(confirmed.scheduledFor);
      setPlacedOrderId(confirmed.orderId);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (code === 'INSUFFICIENT_STOCK') {
        Alert.alert('Không đủ hàng', message ?? 'Một hoặc nhiều sản phẩm không đủ số lượng tồn kho.');
      } else if (code === 'RESTAURANT_NOT_APPROVED' || code === 'RESTAURANT_NOT_ACTIVE') {
        Alert.alert('Tài khoản chưa được duyệt', 'Nhà hàng cần được Admin phê duyệt trước khi đặt hàng.');
      } else if (code === 'DELIVERY_DATE_OUT_OF_WINDOW') {
        Alert.alert('Thời gian không hợp lệ', 'Ngày giao phải từ hiện tại đến tối đa 7 ngày tiếp theo.');
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
        <SuccessView
          orderId={placedOrderId}
          scheduledFor={placedScheduledFor}
          onDone={() => openOrderManagement(placedOrderId)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Cutoff banner ── */}
        <OrderRuleBanner />

        {/* ── Credit alert ── */}
        {creditRatio !== null && (
          <CreditAlertBanner ratio={creditRatio} available={availableCredit} />
        )}

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
            <Ionicons name="time-outline" size={16} color={Colors.primaryText} />
            <Text style={styles.infoText}>{deliveryLabel}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {notes ? (
          <>
            <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color={Colors.primaryText} />
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
  cycleWindow: { fontSize: 13, fontWeight: '700', color: Colors.primaryText },

  // Items
  itemRow: { flexDirection: 'column', padding: 12, gap: 8 },
  itemMainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemNoteWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 2 },
  itemNote: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', flex: 1 },
  itemImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.surfaceVariant },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, marginBottom: 2 },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primaryText },
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
  summaryTotalValue: { fontSize: 15, fontWeight: '800', color: Colors.primaryText },

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
  footerTotal: { fontSize: 18, fontWeight: '800', color: Colors.primaryText },
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
