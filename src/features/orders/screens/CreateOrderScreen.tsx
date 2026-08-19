import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Colors } from '../../../constants/colors';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import { type RestaurantOrdersStackParamList, type CreateOrderItem } from '../../../navigation/types';
import { orderApi, DEFAULT_DELIVERY_WINDOW_DAYS } from '../api/orderApi';
import { formatQuantityWithUnit } from '../../../utils/quantity';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'CreateOrder'>;

/**
 * Every order delivers in the same fixed early-morning window — the restaurant
 * only picks the day, never the time (matches the web checkout's `DELIVERY_HOUR`).
 */
const DELIVERY_HOUR = 4;

function buildScheduledFor(date: Date): string {
  const combined = new Date(date);
  combined.setHours(DELIVERY_HOUR, 0, 0, 0);
  return combined.toISOString();
}

function formatDeliveryLabel(date: Date): string {
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy} (${DELIVERY_HOUR}:00 - ${DELIVERY_HOUR + 2}:00)`;
}

/**
 * One day shorter than the server's own `D..D+windowDays` window
 * (`OrderCutoffScheduler.IsWithinDeliveryWindow` on the backend): that check's
 * upper bound is an exact midnight cutoff, not end-of-day, so the nominal last
 * day would only ever accept a `scheduledFor` of precisely 00:00 — never
 * `DELIVERY_HOUR` (04:00), which every order now carries. Capping the picker
 * here keeps every day it actually offers usable.
 */
function getDeliveryUpperBound(deliveryWindowDays: number): Date {
  const upperBound = new Date();
  upperBound.setHours(0, 0, 0, 0);
  upperBound.setDate(upperBound.getDate() + deliveryWindowDays - 1);
  return upperBound;
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
          <Text style={styles.itemQty}>{formatQuantityWithUnit(item.quantity, item.unit)}</Text>
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

export function CreateOrderScreen({ route, navigation }: Props) {
  const { items } = route.params;
  const [notes, setNotes] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deliveryWindowDays, setDeliveryWindowDays] = useState(DEFAULT_DELIVERY_WINDOW_DAYS);

  useEffect(() => {
    orderApi
      .getOrderingWindow()
      .then((window) => setDeliveryWindowDays(window.deliveryWindowDays))
      .catch(() => {
        // Non-critical — keep the default fallback and let the backend be the final say at submit time.
      });
  }, []);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  // Distinct products, not total kg — `quantity` is a weight, not a unit count.
  const itemCount = items.length;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        is24Hour: true,
        minimumDate: new Date(),
        maximumDate: getDeliveryUpperBound(deliveryWindowDays),
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type !== 'dismissed' && selected) setSelectedDate(selected);
        },
      });
      return;
    }
    setShowDatePicker(true);
  };

  // iOS inline calendar fires onChange continuously while scrolling — just apply live, the
  // modal stays open until the user taps "Xong".
  const handleInlinePickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setSelectedDate(selected);
  };

  const handleNext = () => {
    const scheduledDate = new Date(buildScheduledFor(selectedDate));
    // Compared as a calendar day, not the DELIVERY_HOUR-inclusive instant — the
    // picker's own `maximumDate` is day-granular, so this must agree with what
    // it actually let the user pick (see `getDeliveryUpperBound`'s doc comment).
    const startOfSelectedDay = new Date(selectedDate);
    startOfSelectedDay.setHours(0, 0, 0, 0);
    if (scheduledDate <= new Date() || startOfSelectedDay > getDeliveryUpperBound(deliveryWindowDays)) {
      Alert.alert(
        'Ngày giao không hợp lệ',
        `Ngày giao phải ở tương lai và nằm trong cửa sổ ${deliveryWindowDays} ngày theo quy định của hệ thống.`,
      );
      return;
    }

    navigation.navigate('ConfirmOrder', {
      items,
      scheduledFor: scheduledDate.toISOString(),
      deliveryLabel: formatDeliveryLabel(selectedDate),
      notes: notes.trim() || undefined,
    });
  };

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

        {/* ── Delivery date ── */}
        <Text style={styles.sectionTitle}>Ngày giao hàng</Text>
        <View style={styles.card}>
          <Pressable style={[styles.dateTimeRow, styles.dateTimeRowLast]} onPress={openPicker}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primaryText} />
            <Text style={styles.dateTimeLabel}>Ngày giao hàng</Text>
            <Text style={styles.dateTimeValue}>{selectedDate.toLocaleDateString('vi-VN')}</Text>
          </Pressable>
        </View>
        <Text style={styles.helperCaption}>
          Đơn hàng sẽ được giao tự động vào khung {DELIVERY_HOUR}:00 - {DELIVERY_HOUR + 2}:00 sáng
          ngày đã chọn.
        </Text>

        {/* ── Notes ── */}
        <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
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

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Tổng tạm tính</Text>
          <Text style={styles.footerTotal}>{subtotal.toLocaleString('vi-VN')}đ</Text>
        </View>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Xem xác nhận</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
        </Pressable>
      </View>

      {/* iOS only — Android shows its own native dialog via DateTimePickerAndroid.open */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.pickerBackdrop}>
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>Chọn ngày</Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDoneText}>Xong</Text>
              </Pressable>
            </View>
            {showDatePicker ? (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="inline"
                minimumDate={new Date()}
                maximumDate={getDeliveryUpperBound(deliveryWindowDays)}
                onChange={handleInlinePickerChange}
              />
            ) : null}
          </View>
        </View>
      </Modal>
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

  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  dateTimeRowLast: { borderBottomWidth: 0 },
  dateTimeLabel: { flex: 1, fontSize: 14, color: Colors.onSurface },
  dateTimeValue: { fontSize: 14, fontWeight: '700', color: Colors.primaryText },
  helperCaption: { fontSize: 11, color: Colors.textMuted, marginTop: 6, lineHeight: 15 },

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
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerSheet: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: Colors.primaryText },
});
