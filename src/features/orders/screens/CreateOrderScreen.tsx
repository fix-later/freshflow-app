import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { orderApi } from '../api/orderApi';
import { type RestaurantOrdersStackParamList, type CreateOrderItem } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'CreateOrder'>;

// ─── Delivery time options ──────────────────────────────────────────────
type TimeOption = 'asap' | 'tomorrow_morning' | 'custom';

const TIME_OPTIONS: { id: TimeOption; label: string; sub: string }[] = [
  { id: 'asap', label: 'Sớm nhất có thể', sub: 'Không đặt lịch giao cụ thể' },
  { id: 'tomorrow_morning', label: 'Sáng mai (5:00)', sub: 'Giao lúc 5:00 sáng hôm sau' },
  { id: 'custom', label: 'Tự chọn ngày giờ', sub: 'Nhập thời gian cụ thể' },
];

function buildScheduledFor(option: TimeOption, customValue: string): string | undefined {
  if (option === 'asap') return undefined;
  if (option === 'tomorrow_morning') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(5, 0, 0, 0);
    return d.toISOString();
  }
  // custom: parse "DD/MM/YYYY HH:MM"
  const match = customValue.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const [, dd, mm, yyyy, hh, min] = match;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+07:00`).toISOString();
}

// ─── Success screen ─────────────────────────────────────────────────────
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

// ─── Item row ───────────────────────────────────────────────────────────
function ItemRow({ item }: { item: CreateOrderItem }) {
  return (
    <View style={styles.itemRow}>
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
  );
}

// ─── Main screen ────────────────────────────────────────────────────────
export function CreateOrderScreen({ route, navigation }: Props) {
  const { items } = route.params;

  const [timeOption, setTimeOption] = useState<TimeOption>('asap');
  const [customTime, setCustomTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  const handleSubmit = async () => {
    if (timeOption === 'custom') {
      const pattern = /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/;
      if (!pattern.test(customTime.trim())) {
        Alert.alert('Thời gian không hợp lệ', 'Nhập đúng định dạng DD/MM/YYYY HH:MM');
        return;
      }
    }

    setLoading(true);
    try {
      const scheduledFor = buildScheduledFor(timeOption, customTime.trim());
      const result = await orderApi.create({
        items: items.map(it => ({ marketProductId: it.marketProductId, quantity: it.quantity })),
        scheduledFor,
        notes: notes.trim() || undefined,
      });
      setPlacedOrderId(result.id);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (code === 'INSUFFICIENT_STOCK') {
        Alert.alert('Không đủ hàng', message ?? 'Một hoặc nhiều sản phẩm không đủ số lượng tồn kho.');
      } else if (code === 'RESTAURANT_NOT_APPROVED') {
        Alert.alert('Tài khoản chưa được duyệt', 'Nhà hàng cần được Admin phê duyệt trước khi đặt hàng.');
      } else if (code === 'SCHEDULED_FOR_TOO_SOON') {
        Alert.alert('Thời gian không hợp lệ', 'Thời gian giao phải cách thời điểm hiện tại ít nhất 2 giờ.');
      } else {
        Alert.alert('Lỗi', message ?? 'Không thể tạo đơn hàng. Vui lòng thử lại.');
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
          {TIME_OPTIONS.map(opt => {
            const selected = timeOption === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.timeRow, selected && styles.timeRowSelected]}
                onPress={() => setTimeOption(opt.id)}
              >
                <View style={styles.timeText}>
                  <Text style={[styles.timeLabel, selected && styles.timeLabelSelected]}>{opt.label}</Text>
                  <Text style={styles.timeSub}>{opt.sub}</Text>
                </View>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
          {timeOption === 'custom' && (
            <TextInput
              style={styles.customTimeInput}
              placeholder="DD/MM/YYYY HH:MM  (vd: 20/06/2026 05:00)"
              placeholderTextColor={Colors.textMuted}
              value={customTime}
              onChangeText={setCustomTime}
              keyboardType="numbers-and-punctuation"
              maxLength={16}
            />
          )}
        </View>

        {/* ── Notes ── */}
        <Text style={styles.sectionTitle}>Ghi chú</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            placeholder="VD: Giao trước 5 giờ sáng, gọi trước khi đến..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.notesCounter}>{notes.length}/500</Text>
        </View>

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

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  itemImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.surfaceVariant },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, marginBottom: 2 },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  itemQtyWrap: { alignItems: 'center', minWidth: 36 },
  itemQtyLabel: { fontSize: 10, color: Colors.textMuted },
  itemQty: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },

  // Time options
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  timeRowSelected: { backgroundColor: Colors.primaryLight },
  timeText: { flex: 1 },
  timeLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  timeLabelSelected: { color: Colors.primary },
  timeSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  customTimeInput: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
  },

  // Notes
  notesInput: {
    minHeight: 80,
    padding: 12,
    fontSize: 14,
    color: Colors.onSurface,
  },
  notesCounter: {
    textAlign: 'right',
    fontSize: 11,
    color: Colors.textMuted,
    paddingRight: 12,
    paddingBottom: 8,
  },

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
