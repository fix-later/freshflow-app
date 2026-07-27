import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { MarketHomeStackParamList } from '../../../navigation/types';
import {
  marketProcurementApi,
  type MarketProcurementTaskDto,
  type ProcurementTaskStatus,
} from '../api/marketProcurementApi';

type Props = NativeStackScreenProps<MarketHomeStackParamList, 'ProcurementTaskDetail'>;
type PurchaseInput = { quantity: string; price: string };

const STATUS: Record<ProcurementTaskStatus, { label: string; color: string; background: string }> = {
  Built: { label: 'Đang lập phiếu', color: Colors.textMuted, background: Colors.surfaceContainerHigh },
  Manifested: { label: 'Chờ thu mua', color: '#8A5900', background: Colors.warningLight },
  Purchasing: { label: 'Đang thu mua', color: Colors.primaryText, background: Colors.primaryLight },
  HandedOff: { label: 'Đã bàn giao', color: Colors.secondary, background: Colors.secondaryContainer },
  Cancelled: { label: 'Đã huỷ', color: Colors.danger, background: Colors.dangerLight },
};

const ORDER_STATUS: Record<string, string> = {
  Confirmed: 'Đã xác nhận',
  Batched: 'Đã gom lô',
  PickedUp: 'Đã lấy hàng',
  AtHub: 'Đã tới Hub',
  Delivering: 'Đang giao',
  Delivered: 'Đã giao',
  Cancelled: 'Đã huỷ',
};

function shortCode(value: string): string {
  return `PO-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatMoney(value: number | null): string {
  if (value === null) return 'Chưa có';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function readError(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return message || (error instanceof Error ? error.message : 'Không thể xử lý nhiệm vụ thu mua.');
}

function createInputs(task: MarketProcurementTaskDto): Record<string, PurchaseInput> {
  return Object.fromEntries(task.items.map((item) => [
    item.marketProductId,
    {
      quantity: String(item.actualQuantity ?? item.totalQuantity),
      price: item.actualUnitPrice !== null
        ? String(item.actualUnitPrice)
        : item.referenceUnitPrice !== null
          ? String(item.referenceUnitPrice)
          : '',
    },
  ]));
}

export function ProcurementTaskDetailScreen({ route }: Props) {
  const [task, setTask] = useState<MarketProcurementTaskDto | null>(null);
  const [inputs, setInputs] = useState<Record<string, PurchaseInput>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const nextTask = await marketProcurementApi.getTask(route.params.batchId);
      setTask(nextTask);
      setInputs(createInputs(nextTask));
    } catch (loadError) {
      setError(readError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const unavailableProductIds = useMemo(() => new Set(
    task?.exceptions
      .filter((exception) => exception.type.toLowerCase() === 'unavailable')
      .map((exception) => exception.marketProductId) ?? [],
  ), [task]);

  const canEdit = task?.status === 'Manifested' || task?.status === 'Purchasing';
  const totalPlannedQuantity = task?.items.reduce((sum, item) => sum + item.totalQuantity, 0) ?? 0;

  const updateInput = (marketProductId: string, field: keyof PurchaseInput, value: string) => {
    setInputs((current) => ({
      ...current,
      [marketProductId]: { ...current[marketProductId], [field]: value },
    }));
  };

  const confirmPurchase = async () => {
    if (!task || !canEdit) return;

    const requiredItems = task.items.filter((item) => !unavailableProductIds.has(item.marketProductId));
    const lines = requiredItems.map((item) => ({
      marketProductId: item.marketProductId,
      actualQuantity: Number(inputs[item.marketProductId]?.quantity),
      actualUnitPrice: Number(inputs[item.marketProductId]?.price),
    }));
    const invalidLine = lines.find((line) => (
      !Number.isInteger(line.actualQuantity)
      || line.actualQuantity <= 0
      || !Number.isFinite(line.actualUnitPrice)
      || line.actualUnitPrice <= 0
    ));

    if (invalidLine) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Số lượng phải là số nguyên và đơn giá thực tế phải lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await marketProcurementApi.confirmPurchase(task.id, lines);
      setTask(updated);
      setInputs(createInputs(updated));
      Alert.alert('Đã xác nhận thu mua', 'Số lượng và đơn giá thực tế đã được cập nhật thành công.');
    } catch (submitError) {
      Alert.alert('Không thể xác nhận', readError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handoverToHub = () => {
    if (!task || task.status !== 'Purchasing') return;

    Alert.alert(
      'Bàn giao cho Hub?',
      'Sau khi xác nhận, lô thu mua sẽ được chuyển sang Hub đã được hệ thống chỉ định.',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Xác nhận bàn giao',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updated = await marketProcurementApi.handover(task.id);
              setTask(updated);
              Alert.alert(
                'Đã bàn giao',
                'Task nhận hàng đã được gửi tới các Hub Staff được phân công tại Hub đích.',
              );
            } catch (handoverError) {
              Alert.alert('Không thể bàn giao', readError(handoverError));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading && !task) return <Loading fullScreen label="Đang tải chi tiết thu mua..." />;
  if (error && !task) return <ErrorView fullScreen message={error} onRetry={() => void load()} />;
  if (!task) return null;

  const status = STATUS[task.status];

  return (
    <ScreenContainer
      scroll
      safeArea
      edges={['bottom']}
      padding={false}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          colors={[Colors.primaryText]}
        />
      )}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>NHIỆM VỤ THU MUA</Text>
            <Text style={styles.batchCode} numeric>{shortCode(task.id)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.serviceDate}>{formatDate(task.batchDate)}</Text>
        <View style={styles.metrics}>
          <HeaderMetric value={task.members.length} label="đơn hàng" />
          <HeaderMetric value={task.items.length} label="mặt hàng" />
          <HeaderMetric value={totalPlannedQuantity} label="SL kế hoạch" />
          <HeaderMetric value={task.exceptions.length} label="sự cố" />
        </View>
      </View>

      <View style={styles.content}>
        {error ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>{error}</Text></View> : null}

        <View style={styles.guideCard}>
          <Ionicons name="information-circle-outline" size={21} color={Colors.primaryText} />
          <Text style={styles.guideText}>
            Đối chiếu số lượng kế hoạch, nhập số lượng và đơn giá mua thực tế cho từng mặt hàng rồi xác nhận một lần.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Danh sách cần thu mua</Text>
        <View style={styles.itemList}>
          {task.items.map((item, index) => {
            const unavailable = unavailableProductIds.has(item.marketProductId);
            const input = inputs[item.marketProductId] ?? { quantity: '', price: '' };
            return (
              <View key={item.marketProductId} style={[styles.itemCard, unavailable && styles.itemUnavailable]}>
                <View style={styles.itemHeader}>
                  <View style={styles.sequence}><Text style={styles.sequenceText}>{index + 1}</Text></View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                    <Text style={styles.referencePrice}>Giá tham chiếu: {formatMoney(item.referenceUnitPrice)}</Text>
                  </View>
                  <View style={styles.plannedBadge}>
                    <Text style={styles.plannedValue} numeric>{item.totalQuantity}</Text>
                    <Text style={styles.plannedLabel}>kế hoạch</Text>
                  </View>
                </View>

                {unavailable ? (
                  <View style={styles.unavailableNotice}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                    <Text style={styles.unavailableText}>Đã báo không có hàng — không cần nhập dòng này.</Text>
                  </View>
                ) : (
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số lượng thực tế</Text>
                      <TextInput
                        editable={canEdit && !submitting}
                        value={input.quantity}
                        onChangeText={(value) => updateInput(item.marketProductId, 'quantity', value.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                        style={[styles.input, !canEdit && styles.inputDisabled]}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Đơn giá thực tế</Text>
                      <View style={[styles.priceInputWrap, !canEdit && styles.inputDisabled]}>
                        <TextInput
                          editable={canEdit && !submitting}
                          value={input.price}
                          onChangeText={(value) => updateInput(item.marketProductId, 'price', value.replace(/[^0-9.]/g, ''))}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={Colors.textMuted}
                          style={styles.priceInput}
                        />
                        <Text style={styles.currency}>đ</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Đơn hàng trong lô</Text>
        <View style={styles.orderCard}>
          {task.members.map((member, index) => (
            <View key={member.orderId} style={[styles.orderRow, index === task.members.length - 1 && styles.lastRow]}>
              <View style={styles.orderIcon}>
                <Ionicons name="receipt-outline" size={17} color={Colors.primaryText} />
              </View>
              <View style={styles.orderCopy}>
                <Text style={styles.orderCode} numeric>Đơn #{member.orderId.replaceAll('-', '').slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.orderStatus}>{ORDER_STATUS[member.status] ?? member.status}</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primaryText} />
            </View>
          ))}
        </View>

        {canEdit ? (
          <View style={styles.actionGroup}>
            <Pressable
              disabled={submitting}
              style={({ pressed }) => [styles.confirmButton, (pressed || submitting) && styles.buttonPressed]}
              onPress={() => void confirmPurchase()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Ionicons name="checkmark-done-outline" size={20} color={Colors.onPrimary} />
              )}
              <Text style={styles.confirmButtonText}>
                {task.status === 'Purchasing' ? 'Cập nhật kết quả thu mua' : 'Xác nhận đã thu mua'}
              </Text>
            </Pressable>
            {task.status === 'Purchasing' ? (
              <Pressable
                disabled={submitting}
                style={({ pressed }) => [styles.handoverButton, (pressed || submitting) && styles.buttonPressed]}
                onPress={handoverToHub}
              >
                <Ionicons name="business-outline" size={20} color={Colors.primaryText} />
                <Text style={styles.handoverButtonText}>Bàn giao lô cho Hub</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.readOnlyNotice}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.readOnlyText}>Lô này đã khoá chỉnh sửa ở trạng thái {status.label.toLowerCase()}.</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function HeaderMetric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numeric>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.deepTeal,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '800' },
  batchCode: { color: Colors.white, fontSize: 20, fontFamily: Fonts.monoBold, marginTop: 4 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 9, fontWeight: '800' },
  serviceDate: { color: 'rgba(255,255,255,0.76)', fontSize: 11, marginTop: 7 },
  metrics: { flexDirection: 'row', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)' },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: Colors.white, fontSize: 15, fontFamily: Fonts.monoBold },
  metricLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 8, marginTop: 3 },
  content: { padding: 16, paddingBottom: 34 },
  inlineError: { backgroundColor: Colors.dangerLight, padding: 10, borderRadius: 10, marginBottom: 12 },
  inlineErrorText: { color: Colors.danger, fontSize: 10 },
  guideCard: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 12, backgroundColor: Colors.primaryLight, marginBottom: 20 },
  guideText: { flex: 1, color: Colors.textSecondary, fontSize: 10, lineHeight: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, marginTop: 2 },
  itemList: { gap: 10, marginBottom: 22 },
  itemCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 13 },
  itemUnavailable: { opacity: 0.72 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  sequence: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sequenceText: { color: Colors.primaryText, fontFamily: Fonts.monoBold, fontSize: 11 },
  itemCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  itemName: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800' },
  referencePrice: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  plannedBadge: { alignItems: 'center', minWidth: 48 },
  plannedValue: { color: Colors.primaryText, fontSize: 14, fontFamily: Fonts.monoBold },
  plannedLabel: { color: Colors.textMuted, fontSize: 7, marginTop: 1 },
  inputRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  inputGroup: { flex: 1 },
  inputLabel: { color: Colors.textMuted, fontSize: 8, marginBottom: 5 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, paddingHorizontal: 11, color: Colors.textPrimary, fontFamily: Fonts.monoMedium, fontSize: 12 },
  inputDisabled: { backgroundColor: Colors.surfaceContainerHigh, opacity: 0.7 },
  priceInputWrap: { height: 42, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  priceInput: { flex: 1, height: 40, paddingHorizontal: 11, color: Colors.textPrimary, fontFamily: Fonts.monoMedium, fontSize: 12 },
  currency: { color: Colors.textMuted, fontSize: 10, paddingRight: 10 },
  unavailableNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11, padding: 9, borderRadius: 8, backgroundColor: Colors.dangerLight },
  unavailableText: { flex: 1, color: Colors.danger, fontSize: 9 },
  orderCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 22 },
  orderRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  lastRow: { borderBottomWidth: 0 },
  orderIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  orderCopy: { flex: 1, paddingHorizontal: 9 },
  orderCode: { color: Colors.textPrimary, fontSize: 10, fontFamily: Fonts.monoBold },
  orderStatus: { color: Colors.textMuted, fontSize: 8, marginTop: 3 },
  actionGroup: { gap: 9 },
  confirmButton: { minHeight: 50, borderRadius: 13, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  handoverButton: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: Colors.primary600, backgroundColor: Colors.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  handoverButtonText: { color: Colors.primaryText, fontSize: 12, fontWeight: '800' },
  buttonPressed: { opacity: 0.72 },
  confirmButtonText: { color: Colors.onPrimary, fontSize: 12, fontWeight: '800' },
  readOnlyNotice: { minHeight: 50, borderRadius: 12, backgroundColor: Colors.surfaceContainerHigh, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  readOnlyText: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
});
