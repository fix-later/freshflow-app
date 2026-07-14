import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { RestaurantColors as Colors } from '../../restaurant/theme';
import {
  RestaurantText as Text,
  RestaurantTextInput as TextInput,
} from '../../restaurant/components/RestaurantText';
import { orderApi, type RecurrenceType } from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'CreateRecurringOrder'>;

type PickerMode = 'date' | 'time' | null;

const RECURRENCE_OPTIONS: { id: RecurrenceType; label: string; sub: string }[] = [
  { id: 'daily', label: 'Hằng ngày', sub: 'Tự động tạo đơn mỗi ngày' },
  { id: 'weekly', label: 'Hằng tuần', sub: 'Tự động tạo đơn mỗi tuần, đúng thứ của lần đầu' },
];

function getDefaultFirstRun(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(5, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function CreateRecurringOrderScreen({ navigation, route }: Props) {
  const editingId = route.params?.scheduledOrderId;
  const isEditMode = !!editingId;

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(null);
  const [firstRunAt, setFirstRunAt] = useState<Date>(getDefaultFirstRun);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Sửa lịch đặt hàng' : 'Đặt hàng định kỳ' });
  }, [navigation, isEditMode]);

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const existing = await orderApi.getScheduledOrder(editingId);
        setRecurrenceType(existing.recurrenceType);
        setFirstRunAt(new Date(existing.firstRunAt));
        setNotes(existing.notes ?? '');
      } catch {
        Alert.alert('Lỗi', 'Không thể tải thông tin lịch đặt hàng.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [editingId, navigation]);

  const applyPicked = (mode: 'date' | 'time', selected: Date) => {
    const merged = new Date(firstRunAt);
    if (mode === 'date') {
      merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setFirstRunAt(merged);
    if (formError) setFormError(null);
  };

  const openPicker = (mode: 'date' | 'time') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: firstRunAt,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? new Date() : undefined,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type !== 'dismissed' && selected) applyPicked(mode, selected);
        },
      });
      return;
    }
    setPickerMode(mode);
  };

  // iOS inline spinner fires onChange continuously while scrolling — just apply live, the
  // modal stays open until the user taps "Xong".
  const handleInlinePickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (pickerMode && selected) applyPicked(pickerMode, selected);
  };

  const handleSubmit = async () => {
    if (!recurrenceType) {
      setFormError('Vui lòng chọn chu kỳ lặp lại.');
      return;
    }
    if (firstRunAt.getTime() <= Date.now()) {
      setFormError('Thời gian chạy lần đầu phải ở trong tương lai.');
      return;
    }

    const payload = {
      recurrenceType,
      firstRunAt: firstRunAt.toISOString(),
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await orderApi.updateScheduledOrder(editingId, payload);
        Alert.alert('Đã lưu thay đổi', 'Lịch đặt hàng định kỳ đã được cập nhật.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await orderApi.createScheduledOrder(payload);
        Alert.alert('Đã tạo lịch đặt hàng', 'Đơn hàng sẽ được tự động tạo theo chu kỳ bạn chọn.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert(
        editingId ? 'Không thể lưu thay đổi' : 'Không thể tạo lịch đặt hàng',
        message ?? 'Vui lòng kiểm tra lại thông tin và thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin lịch đặt hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primaryText} />
          <Text style={styles.infoText}>
            Hệ thống sẽ tự động tạo đơn hàng mới theo chu kỳ bạn chọn, bắt đầu từ thời gian chạy lần đầu.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Chu kỳ lặp lại *</Text>
        <View style={styles.card}>
          {RECURRENCE_OPTIONS.map((option) => {
            const selected = recurrenceType === option.id;
            return (
              <Pressable
                key={option.id}
                style={styles.optionRow}
                onPress={() => {
                  setRecurrenceType(option.id);
                  if (formError) setFormError(null);
                }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? Colors.primaryText : Colors.outline}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionSub}>{option.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Thời gian chạy lần đầu *</Text>
        <View style={styles.card}>
          <Pressable style={styles.dateTimeRow} onPress={() => openPicker('date')}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primaryText} />
            <Text style={styles.dateTimeLabel}>Ngày</Text>
            <Text style={styles.dateTimeValue}>{formatDate(firstRunAt)}</Text>
          </Pressable>
          <Pressable style={[styles.dateTimeRow, styles.dateTimeRowLast]} onPress={() => openPicker('time')}>
            <Ionicons name="time-outline" size={18} color={Colors.primaryText} />
            <Text style={styles.dateTimeLabel}>Giờ</Text>
            <Text style={styles.dateTimeValue}>{formatTime(firstRunAt)}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Ghi chú</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.textArea}
            placeholder="Ghi chú cho đơn hàng tự động (không bắt buộc)..."
            placeholderTextColor={Colors.outline}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
        </View>

        {formError ? <Text style={styles.errorMsgText}>{formError}</Text> : null}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={Colors.onPrimary} size="small" />
            : <Text style={styles.submitBtnText}>{editingId ? 'Lưu thay đổi' : 'Tạo lịch đặt hàng'}</Text>
          }
        </Pressable>
      </View>

      {/* iOS only — Android shows its own native dialog via DateTimePickerAndroid.open */}
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.pickerBackdrop}>
          <TouchableWithoutFeedback onPress={() => setPickerMode(null)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>
                {pickerMode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
              </Text>
              <Pressable onPress={() => setPickerMode(null)}>
                <Text style={styles.pickerDoneText}>Xong</Text>
              </Pressable>
            </View>
            {pickerMode ? (
              <DateTimePicker
                value={firstRunAt}
                mode={pickerMode}
                display={pickerMode === 'date' ? 'inline' : 'spinner'}
                is24Hour
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.outline, fontWeight: '500' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  optionLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  optionSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.onSurface,
  },
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
  textArea: {
    minHeight: 90,
    padding: 14,
    fontSize: 14,
    color: Colors.onSurface,
    textAlignVertical: 'top',
  },
  errorMsgText: { fontSize: 12, color: Colors.error, marginTop: 8 },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  submitBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
