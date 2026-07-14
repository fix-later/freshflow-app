import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RestaurantColors as Colors } from '../../restaurant/theme';
import {
  RestaurantText as Text,
  RestaurantTextInput as TextInput,
} from '../../restaurant/components/RestaurantText';
import { type RestaurantOrdersStackParamList, type CreateOrderItem } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'CreateOrder'>;

type TimeOption = 'asap' | 'tomorrow_morning' | 'custom';

const TIME_OPTIONS: { id: TimeOption; label: string; sub: string }[] = [
  { id: 'asap', label: 'Sớm nhất có thể', sub: 'Không đặt lịch giao cụ thể' },
  { id: 'tomorrow_morning', label: 'Sáng mai (5:00)', sub: 'Giao lúc 5:00 sáng hôm sau' },
  { id: 'custom', label: 'Tự chọn ngày giờ', sub: 'Nhập thời gian cụ thể' },
];

function buildScheduledForCustom(date: Date, time: Date): string {
  const combined = new Date(date);
  combined.setHours(time.getHours());
  combined.setMinutes(time.getMinutes());
  combined.setSeconds(0);
  combined.setMilliseconds(0);
  return combined.toISOString();
}

function formatCustomLabel(date: Date, time: Date): string {
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = time.getHours().toString().padStart(2, '0');
  const min = time.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
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

export function CreateOrderScreen({ route, navigation }: Props) {
  const { items } = route.params;
  const [timeOption, setTimeOption] = useState<TimeOption>('asap');
  const [notes, setNotes] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d;
  });
  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(5, 0, 0, 0); // default to 5:00 AM
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  const onChangeDate = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const onChangeTime = (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleNext = () => {
    let scheduledFor: string | undefined = undefined;
    let deliveryLabel = 'Sớm nhất có thể';

    if (timeOption === 'tomorrow_morning') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(5, 0, 0, 0);
      scheduledFor = d.toISOString();
      deliveryLabel = 'Sáng mai (5:00)';
    } else if (timeOption === 'custom') {
      scheduledFor = buildScheduledForCustom(selectedDate, selectedTime);
      deliveryLabel = formatCustomLabel(selectedDate, selectedTime);
    }

    navigation.navigate('ConfirmOrder', {
      items,
      scheduledFor,
      deliveryLabel,
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
            <View style={styles.customPickerContainer}>
              <Pressable
                style={styles.pickerSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.primaryText} />
                <View>
                  <Text style={styles.pickerSelectorLabel}>Ngày giao hàng</Text>
                  <Text style={styles.pickerSelectorValue}>
                    {selectedDate.toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.pickerSelector}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={Colors.primaryText} />
                <View>
                  <Text style={styles.pickerSelectorLabel}>Giờ giao hàng</Text>
                  <Text style={styles.pickerSelectorValue}>
                    {selectedTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={onChangeDate}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
        </View>

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
  timeLabelSelected: { color: Colors.primaryText },
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
  customPickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 14,
  },
  pickerSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLow,
  },
  pickerSelectorLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  pickerSelectorValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 1,
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
});
