import { useCallback, useEffect, useState } from 'react';
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
import {
  orderApi,
  DEFAULT_DELIVERY_WINDOW_DAYS,
  type OrderConfirmationPreviewDto,
} from '../api/orderApi';
import { useCartStore } from '../../../store/cartStore';
import { type RestaurantOrdersStackParamList, type CreateOrderItem } from '../../../navigation/types';
import { creditApi } from '../../credit/api/creditApi';
import { restaurantApi, type DeliveryAddressDto } from '../../restaurant/api/restaurantApi';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ConfirmOrder'>;

// Matches RestaurantCredit's Warning (>=80%) / Exceeded (>=100%) thresholds on
// the backend, so this banner agrees with what triggers BE credit alerts.
const CREDIT_WARNING_RATIO = 0.8;
const CREDIT_EXCEEDED_RATIO = 1;

function CreditAlertBanner({ ratio, available }: { ratio: number; available: number }) {
  if (ratio < CREDIT_WARNING_RATIO) return null;
  const isDanger = ratio >= CREDIT_EXCEEDED_RATIO;
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
  onViewOrder,
  onGoHome,
}: {
  orderId: string;
  scheduledFor: string | null;
  onViewOrder: () => void;
  onGoHome: () => void;
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
      <Pressable style={styles.successBtn} onPress={onViewOrder}>
        <Text style={styles.successBtnText}>Xem đơn hàng</Text>
      </Pressable>
      <Pressable style={styles.homeBtn} onPress={onGoHome}>
        <Text style={styles.homeBtnText}>Về trang chủ</Text>
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
  const [deliveryWindowDays, setDeliveryWindowDays] = useState(DEFAULT_DELIVERY_WINDOW_DAYS);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddressDto[] | null>(null);
  const [preview, setPreview] = useState<OrderConfirmationPreviewDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { clearCart } = useCartStore();

  // BE returns addresses sorted default-first (OrderByDescending(IsDefault).ThenBy(CreatedAt)),
  // so the first entry is always the right one to preselect.
  const selectedAddress = deliveryAddresses?.[0] ?? null;
  const addressesLoaded = deliveryAddresses !== null;

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

    orderApi
      .getOrderingWindow()
      .then((window) => setDeliveryWindowDays(window.deliveryWindowDays))
      .catch(() => {
        // non-critical — keep the default fallback, backend still validates for real at submit time
      });

    // Required to confirm (BE's ConfirmOrderRequest.DeliveryAddressId is non-empty-validated) —
    // unlike the other two calls above this one is NOT non-critical, so failures still leave
    // deliveryAddresses as [] rather than null, which correctly blocks submit below.
    restaurantApi
      .getDeliveryAddresses()
      .then(setDeliveryAddresses)
      .catch(() => setDeliveryAddresses([]));
  }, []);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  const openOrderManagement = (orderId: string) => {
    navigation.getParent<any>()?.navigate('RestaurantTracking', {
        screen: 'OrderDetail',
        params: { orderId },
      });
  };

  // Shared by refreshPreview (display-only quote) and handleSubmit (the real confirm) so the
  // draft is created at most once — the confirm always reuses whatever draft the quote made.
  const ensureDraftOrder = useCallback(async (): Promise<string> => {
    if (draftOrderId) return draftOrderId;
    const itemNotes = items
      .filter((item) => item.note?.trim())
      .map((item) => `${item.productName}: ${item.note!.trim()}`);
    const apiNotes = [notes?.trim(), ...itemNotes].filter(Boolean).join('\n') || undefined;
    const draft = await orderApi.create({
      items: items.map((it) => ({ marketProductId: it.marketProductId, quantity: it.quantity })),
      scheduledFor,
      notes: apiNotes,
    });
    setDraftOrderId(draft.orderId);
    return draft.orderId;
  }, [draftOrderId, items, scheduledFor, notes]);

  // Best-effort real-price quote (delivery fee is priced by distance to the address, so it can
  // only come from the server) — shown in the summary before the user taps "Đặt hàng". A failed
  // quote just falls back to the client-computed subtotal below; it never blocks checkout.
  const refreshPreview = useCallback(async () => {
    if (!selectedAddress) return;
    setPreviewLoading(true);
    try {
      const currentDraftId = await ensureDraftOrder();
      const result = await orderApi.previewConfirmation(currentDraftId, selectedAddress.id);
      setPreview(result);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedAddress, ensureDraftOrder]);

  useEffect(() => {
    void refreshPreview();
    // Only re-run when the selected address actually changes (e.g. once it finishes loading) —
    // items/scheduledFor/notes are fixed route params on this screen, never edited here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.id]);

  const handleSubmit = async () => {
    if (!selectedAddress) {
      Alert.alert(
        'Chưa có địa chỉ giao hàng',
        'Vui lòng thêm địa chỉ giao hàng trước khi đặt đơn.',
        [
          {
            text: 'Thêm địa chỉ',
            onPress: () =>
              navigation.getParent<any>()?.navigate('RestaurantProfile', {
                screen: 'DeliveryAddresses',
              }),
          },
          { text: 'Để sau', style: 'cancel' },
        ],
      );
      return;
    }
    setLoading(true);
    // Declared outside the try so the catch block can still offer "Xem bản nháp"
    // for a draft that was created successfully but failed at the confirm step —
    // otherwise the user loses track of it and re-submitting creates a duplicate.
    let currentDraftId = draftOrderId;
    try {
      currentDraftId = await ensureDraftOrder();

      // Re-fetch right before confirming (not just reusing the summary's `preview` state) —
      // price/cutoff can shift in the time the user spent looking at the screen, and this is
      // the same check the server re-runs inside confirm, so a stale quote here would just
      // mean a redundant round-trip, not a wrong result — but a fresh one catches a "would no
      // longer succeed" case before wasting the actual confirm attempt.
      const confirmPreview = await orderApi.previewConfirmation(currentDraftId, selectedAddress.id);
      if (!confirmPreview.wouldSucceed) {
        const issues = confirmPreview.issues.map((issue) => `• ${issue.message}`).join('\n');
        Alert.alert(
          'Chưa thể xác nhận đơn',
          `${issues || 'Đơn hàng chưa đáp ứng điều kiện xác nhận.'}\n\nBản nháp đã được lưu trong lịch sử đơn hàng.`,
          buildFailureAlertButtons(currentDraftId),
        );
        return;
      }

      const confirmed = await orderApi.confirm(currentDraftId, selectedAddress.id);

      clearCart();
      setPlacedScheduledFor(confirmed.scheduledFor);
      setPlacedOrderId(confirmed.orderId);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const buttons = buildFailureAlertButtons(currentDraftId);
      if (code === 'INSUFFICIENT_STOCK') {
        Alert.alert('Không đủ hàng', message ?? 'Một hoặc nhiều sản phẩm không đủ số lượng tồn kho.', buttons);
      } else if (code === 'RESTAURANT_NOT_APPROVED' || code === 'RESTAURANT_NOT_ACTIVE') {
        Alert.alert('Tài khoản chưa được duyệt', 'Nhà hàng cần được Admin phê duyệt trước khi đặt hàng.', buttons);
      } else if (code === 'DELIVERY_DATE_OUT_OF_WINDOW') {
        Alert.alert(
          'Thời gian không hợp lệ',
          `Ngày giao phải từ hiện tại đến tối đa ${deliveryWindowDays} ngày tiếp theo.`,
          buttons,
        );
      } else if (
        code === 'CREDIT_LIMIT_EXCEEDED' ||
        code === 'INSUFFICIENT_CREDIT' ||
        (message ?? '').toLowerCase().includes('credit')
      ) {
        Alert.alert(
          'Hạn mức tín dụng không đủ',
          'Đơn hàng vượt quá hạn mức tín dụng hiện tại của nhà hàng. Vui lòng liên hệ FreshFlow để được cấp hạn mức.',
          buttons,
        );
      } else {
        Alert.alert('Không thể đặt hàng', message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.', buttons);
      }
    } finally {
      setLoading(false);
    }
  };

  // `currentDraftId` is only non-null once `orderApi.create()` has succeeded — if it
  // failed before that point, there is no draft to show and this falls back to a plain "Đóng".
  const buildFailureAlertButtons = useCallback(
    (currentDraftId: string | null) =>
      currentDraftId
        ? [
            { text: 'Xem bản nháp', onPress: () => openOrderManagement(currentDraftId) },
            { text: 'Đóng', style: 'cancel' as const },
          ]
        : undefined,
    [openOrderManagement],
  );

  if (placedOrderId) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <SuccessView
          orderId={placedOrderId}
          scheduledFor={placedScheduledFor}
          onViewOrder={() => openOrderManagement(placedOrderId)}
          onGoHome={() => navigation.popToTop()}
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

        {/* ── Delivery address ── */}
        <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
        <View style={styles.card}>
          {selectedAddress ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primaryText} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>
                  {selectedAddress.recipientName} · {selectedAddress.phone}
                </Text>
                <Text style={styles.addressLine}>{selectedAddress.addressLine}</Text>
              </View>
            </View>
          ) : addressesLoaded ? (
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={[styles.infoText, { color: Colors.danger }]}>
                Chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ trước khi đặt đơn.
              </Text>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <ActivityIndicator size="small" color={Colors.textMuted} />
              <Text style={[styles.infoText, { color: Colors.textMuted }]}>Đang tải địa chỉ...</Text>
            </View>
          )}
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
            <Text style={styles.summaryValue}>
              {(preview?.subtotalAmount ?? subtotal).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Phí vận chuyển
              {preview?.deliveryDistanceKm ? ` (${preview.deliveryDistanceKm.toFixed(1)} km)` : ''}
            </Text>
            {previewLoading ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : preview ? (
              <Text style={styles.summaryValue}>{preview.deliveryFee.toLocaleString('vi-VN')}đ</Text>
            ) : (
              <Text style={styles.summaryNote}>Sẽ xác nhận sau</Text>
            )}
          </View>
          {preview && preview.vatAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thuế VAT</Text>
              <Text style={styles.summaryValue}>{preview.vatAmount.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Giá trị đơn hàng</Text>
            <Text style={styles.summaryTotalValue}>
              {(preview?.totalAmount ?? subtotal).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Tổng tạm tính</Text>
          <Text style={styles.footerTotal}>
            {(preview?.totalAmount ?? subtotal).toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <Pressable
          style={[styles.submitBtn, (loading || !addressesLoaded) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !addressesLoaded}
        >
          {loading || !addressesLoaded
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
  addressLine: { fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },

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
    minWidth: 220,
    alignItems: 'center',
    marginBottom: 12,
  },
  successBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
  homeBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 13,
    minWidth: 220,
    alignItems: 'center',
  },
  homeBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
});
