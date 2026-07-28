import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { hubApi, isInboundReceived, type HubInboundTask } from '../api/hubApi';

type Navigation = NativeStackNavigationProp<HubStackParamList, 'CheckIn'>;

type Props = {
  task: HubInboundTask;
  navigation: Navigation;
};

function shortCode(value: string): string {
  return `IN-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function shortBatchCode(value: string | null): string {
  if (!value) return 'Không có mã lô';
  return `LO-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function shortMarketCode(value: string | null): string {
  if (!value) return 'Chưa xác định';
  return `CHỢ-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function shortProductCode(value: string | null, fallback: number): string {
  if (!value) return `Mặt hàng ${fallback}`;
  return `SP-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatWeight(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} kg`;
}

function getErrorMessage(error: unknown): string {
  const responseMessage = (error as {
    response?: { data?: { message?: unknown } };
  })?.response?.data?.message;

  if (typeof responseMessage === 'string' && responseMessage.length > 0) return responseMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể xác nhận nhận hàng. Vui lòng thử lại.';
}

export function AssignedInboundTaskScreen({ task, navigation }: Props) {
  const initiallyReceived = isInboundReceived(task.status);
  const [submitting, setSubmitting] = useState(false);
  const [received, setReceived] = useState(initiallyReceived);
  const [checkedItemIds, setCheckedItemIds] = useState(() => new Set(
    initiallyReceived ? task.items.map((item) => item.marketProductId) : [],
  ));
  const checkedWeight = task.items.reduce((sum, item) => (
    checkedItemIds.has(item.marketProductId) ? sum + item.quantityKg : sum
  ), 0);
  const allItemsChecked = task.items.length > 0 && checkedItemIds.size === task.items.length;

  const toggleItem = (marketProductId: string) => {
    if (received) return;
    setCheckedItemIds((current) => {
      const next = new Set(current);
      if (next.has(marketProductId)) next.delete(marketProductId);
      else next.add(marketProductId);
      return next;
    });
  };

  const confirmInbound = async () => {
    setSubmitting(true);
    try {
      await hubApi.confirmInbound(task.inboundId);
      setReceived(true);
      Alert.alert(
        'Đã kiểm đủ và nhận lô',
        'Lô hàng đã được ghi nhận tại Hub. Các đơn thuộc lô này hiện có thể xuất hiện ở màn phân hàng theo nhà hàng.',
        [
          { text: 'Danh sách lô', onPress: () => navigation.goBack() },
          { text: 'Phân loại đơn', onPress: () => navigation.navigate('HubTabs', { screen: 'Sorting' }) },
        ],
      );
    } catch (error) {
      Alert.alert('Không thể nhận lô hàng', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const requestConfirmation = () => {
    if (!allItemsChecked) return;
    Alert.alert(
      'Xác nhận đã kiểm đủ lô hàng?',
      `Bạn đã đối chiếu đủ ${task.items.length} mặt hàng, tổng ${formatWeight(task.totalQuantityKg)} theo lô được đặt.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => void confirmInbound() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.taskCard}>
            <View style={styles.taskTop}>
              <View style={[styles.taskIcon, received && styles.taskIconReceived]}>
                <Ionicons name={received ? 'checkmark' : 'cube-outline'} size={23} color={Colors.primaryText} />
              </View>
              <View style={styles.taskCopy}>
                <Text numeric style={styles.taskCode}>{shortCode(task.inboundId)}</Text>
                <Text numberOfLines={1} style={styles.hubName}>{task.hub.name}</Text>
              </View>
              <View style={[styles.statusBadge, received ? styles.statusReceived : styles.statusPending]}>
                <Ionicons
                  name={received ? 'checkmark-circle-outline' : 'time-outline'}
                  size={14}
                  color={received ? Colors.primaryText : '#8A5900'}
                />
                <Text style={[styles.statusText, received ? styles.statusTextReceived : styles.statusTextPending]}>
                  {received ? 'Đã nhận' : 'Chờ nhận'}
                </Text>
              </View>
            </View>

            <View style={styles.taskInfo}>
              <Info
                label={task.deliveryScheduleId ? 'MA bàn giao lúc' : 'Thời gian dự kiến'}
                value={formatDateTime(task.arrivedAt)}
              />
              <Info label="Khối lượng" value={formatWeight(task.totalQuantityKg)} numeric />
              <Info label="Số mặt hàng" value={`${task.items.length}`} numeric />
            </View>
          </View>

          <View style={styles.sourceCard}>
            <View style={styles.sourceIcon}>
              <Ionicons name="swap-horizontal-outline" size={20} color={Colors.secondary} />
            </View>
            <View style={styles.sourceCopy}>
              <Text style={styles.sourceLabel}>Lô bàn giao từ Market Agent</Text>
              <Text numeric style={styles.sourceBatch}>{shortBatchCode(task.deliveryScheduleId)}</Text>
              <Text numeric style={styles.sourceMarket}>Nguồn: {shortMarketCode(task.sourceMarketId)}</Text>
            </View>
          </View>

          <View style={styles.assignmentNotice}>
            <Ionicons name="clipboard-outline" size={20} color={Colors.primaryText} />
            <View style={styles.assignmentNoticeCopy}>
              <Text style={styles.assignmentNoticeTitle}>Cách kiểm đếm lô hàng</Text>
              <Text style={styles.assignmentNoticeText}>
                Đếm hàng thực tế, đối chiếu với số lượng cần nhận bên dưới rồi đánh dấu từng mặt hàng. Chỉ xác nhận lô khi tất cả đều khớp.
              </Text>
            </View>
          </View>

          <View style={styles.countProgressCard}>
            <View style={styles.countProgressTop}>
              <View>
                <Text style={styles.countProgressLabel}>TIẾN ĐỘ ĐỐI CHIẾU</Text>
                <Text style={styles.countProgressTitle}>
                  {allItemsChecked ? 'Số lượng đã khớp với lô đặt' : 'Đang kiểm số lượng thực nhận'}
                </Text>
              </View>
              <Text numeric style={styles.countProgressValue}>{checkedItemIds.size}/{task.items.length}</Text>
            </View>
            <View style={styles.countProgressTrack}>
              <View
                style={[
                  styles.countProgressFill,
                  { width: `${task.items.length === 0 ? 0 : (checkedItemIds.size / task.items.length) * 100}%` },
                ]}
              />
            </View>
            <Text numeric style={styles.checkedWeight}>
              Đã đối chiếu {formatWeight(checkedWeight)} / {formatWeight(task.totalQuantityKg)}
            </Text>
          </View>

          <View style={styles.headingRow}>
            <View>
              <Text style={styles.sectionTitle}>Danh sách mặt hàng dự kiến</Text>
              <Text style={styles.sectionSubtitle}>Chạm vào từng dòng khi số lượng thực tế đúng</Text>
            </View>
            <Text numeric style={styles.itemCount}>{task.items.length} mặt hàng</Text>
          </View>

          <View style={styles.productList}>
            {task.items.map((item, index) => {
              const checked = checkedItemIds.has(item.marketProductId);
              return (
              <Pressable
                key={item.marketProductId}
                disabled={received}
                style={[styles.productCard, checked && styles.productCardChecked]}
                onPress={() => toggleItem(item.marketProductId)}
              >
                <View style={[styles.productIndex, checked && styles.productIndexChecked]}>
                  {checked ? (
                    <Ionicons name="checkmark" size={19} color={Colors.onPrimary} />
                  ) : (
                    <Text numeric style={styles.productIndexText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.productCopy}>
                  <Text style={styles.productName}>
                    {item.productName || shortProductCode(item.productId, index + 1)}
                  </Text>
                  <Text numeric numberOfLines={1} style={styles.marketProductCode}>
                    Mã nguồn: {item.marketProductId}
                  </Text>
                  <Text style={[styles.checkStatus, checked && styles.checkStatusDone]}>
                    {checked ? 'Đã kiểm đủ thực tế' : 'Chưa đối chiếu thực tế'}
                  </Text>
                </View>
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityLabel}>THEO ĐƠN/LÔ</Text>
                  <Text numeric style={styles.quantityValue}>{formatWeight(item.quantityKg)}</Text>
                </View>
              </Pressable>
              );
            })}
          </View>

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.secondary} />
            <Text style={styles.noteText}>
              Nếu có mặt hàng thiếu, thừa hoặc sai, không đánh dấu và không xác nhận nhận lô. BE hiện chưa có API nhập số lượng thực nhận hoặc lưu chênh lệch trước khi nhận.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>{received ? 'Đã nhận đủ' : 'Đã đối chiếu'}</Text>
            <Text numeric style={styles.footerValue}>{checkedItemIds.size}/{task.items.length} mặt hàng</Text>
          </View>
          {received ? (
            <Pressable
              style={styles.doneButton}
              onPress={() => navigation.navigate('HubTabs', { screen: 'Sorting' })}
            >
              <Ionicons name="layers-outline" size={19} color={Colors.primaryText} />
              <Text style={styles.doneButtonText}>Chuyển sang phân loại đơn</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.confirmButton, (submitting || !allItemsChecked) && styles.buttonDisabled]}
              disabled={submitting || !allItemsChecked}
              onPress={requestConfirmation}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Ionicons name="scan-outline" size={19} color={Colors.onPrimary} />
              )}
              <Text style={styles.confirmButtonText}>
                {submitting
                  ? 'Đang xác nhận...'
                  : allItemsChecked
                    ? 'Xác nhận đã kiểm đủ'
                    : `Còn ${task.items.length - checkedItemIds.size} mặt hàng chưa kiểm`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Info({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} numeric={numeric} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 24 },
  taskCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  taskTop: { flexDirection: 'row', alignItems: 'center' },
  taskIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconReceived: { backgroundColor: Colors.primaryLight },
  taskCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  taskCode: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.monoBold, color: Colors.deepTeal },
  hubName: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusPending: { backgroundColor: Colors.warningLight },
  statusReceived: { backgroundColor: Colors.primaryLight },
  statusText: { fontSize: 9, fontWeight: '700' },
  statusTextPending: { color: '#8A5900' },
  statusTextReceived: { color: Colors.primaryText },
  taskInfo: {
    flexDirection: 'row',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
  },
  sourceIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCopy: { flex: 1, paddingLeft: 10 },
  sourceLabel: { fontSize: 9, color: Colors.textMuted },
  sourceBatch: { fontSize: 12, fontFamily: Fonts.monoBold, color: Colors.textPrimary, marginTop: 2 },
  sourceMarket: { fontSize: 8, fontFamily: Fonts.monoRegular, color: Colors.textSecondary, marginTop: 3 },
  infoItem: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  infoLabel: { fontSize: 9, color: Colors.textMuted },
  infoValue: { fontSize: 10, fontWeight: '600', color: Colors.textPrimary, marginTop: 3 },
  assignmentNotice: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  assignmentNoticeCopy: { flex: 1 },
  assignmentNoticeTitle: { fontSize: 11, fontWeight: '800', color: Colors.primaryText },
  assignmentNoticeText: { fontSize: 9, lineHeight: 14, color: Colors.textSecondary, marginTop: 3 },
  countProgressCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 13,
  },
  countProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countProgressLabel: { fontSize: 8, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  countProgressTitle: { fontSize: 11, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  countProgressValue: { fontSize: 14, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  countProgressTrack: { height: 6, borderRadius: 999, backgroundColor: Colors.surfaceContainerHigh, overflow: 'hidden', marginTop: 11 },
  countProgressFill: { height: '100%', borderRadius: 999, backgroundColor: Colors.primary },
  checkedWeight: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textSecondary, marginTop: 7 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.deepTeal },
  sectionSubtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  itemCount: { fontSize: 10, fontWeight: '600', fontFamily: Fonts.monoSemibold, color: Colors.primaryText },
  productList: { gap: 10 },
  productCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  productCardChecked: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  productIndex: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIndexText: { color: Colors.primaryText, fontSize: 13, fontFamily: Fonts.monoBold },
  productIndexChecked: { backgroundColor: Colors.primary },
  productCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  productName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  marketProductCode: { fontSize: 8, fontFamily: Fonts.monoRegular, color: Colors.textMuted, marginTop: 3 },
  checkStatus: { fontSize: 8, color: Colors.warning, marginTop: 4 },
  checkStatusDone: { color: Colors.primaryText, fontWeight: '700' },
  quantityBadge: { borderRadius: 9, backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 9, paddingVertical: 7, alignItems: 'flex-end' },
  quantityLabel: { fontSize: 7, fontWeight: '800', color: Colors.textMuted, marginBottom: 2 },
  quantityValue: { fontSize: 10, fontFamily: Fonts.monoSemibold, color: Colors.textPrimary },
  noteCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.secondaryContainer,
    backgroundColor: '#F4F5FA',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noteText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerSummary: { minWidth: 94 },
  footerLabel: { fontSize: 9, color: Colors.textMuted },
  footerValue: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.monoBold, color: Colors.deepTeal, marginTop: 2 },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.65 },
  confirmButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '700' },
  doneButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  doneButtonText: { color: Colors.primaryText, fontSize: 11, fontWeight: '700' },
});
