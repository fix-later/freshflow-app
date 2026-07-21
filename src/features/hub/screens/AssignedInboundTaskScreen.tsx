import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { hubApi, type HubInboundTask } from '../api/hubApi';

type Navigation = NativeStackNavigationProp<HubStackParamList, 'CheckIn'>;

type Props = {
  task: HubInboundTask;
  navigation: Navigation;
};

function shortCode(value: string): string {
  return `IN-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
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
  const [submitting, setSubmitting] = useState(false);
  const [received, setReceived] = useState(task.status === 'ARRIVED_AT_HUB');

  const confirmInbound = async () => {
    setSubmitting(true);
    try {
      await hubApi.confirmInbound(task.inboundId);
      setReceived(true);
      Alert.alert(
        'Đã xác nhận nhận hàng',
        'Lô hàng đã được ghi nhận tại Hub và tồn kho đã được cập nhật.',
        [{ text: 'Quay lại danh sách', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert('Không thể nhận lô hàng', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const requestConfirmation = () => {
    Alert.alert(
      'Xác nhận nhận lô hàng?',
      `${shortCode(task.inboundId)} gồm ${task.items.length} mặt hàng, tổng ${formatWeight(task.totalQuantityKg)}.`,
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
              <Info label="Thời gian dự kiến" value={formatDateTime(task.arrivedAt)} />
              <Info label="Khối lượng" value={formatWeight(task.totalQuantityKg)} numeric />
              <Info label="Số mặt hàng" value={`${task.items.length}`} numeric />
            </View>
          </View>

          <View style={styles.assignmentNotice}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primaryText} />
            <View style={styles.assignmentNoticeCopy}>
              <Text style={styles.assignmentNoticeTitle}>Task thuộc phạm vi được phân công</Text>
              <Text style={styles.assignmentNoticeText}>
                API đã xác thực tài khoản của bạn được gán vào {task.hub.name} trước khi cho phép nhận lô.
              </Text>
            </View>
          </View>

          <View style={styles.headingRow}>
            <View>
              <Text style={styles.sectionTitle}>Danh sách mặt hàng dự kiến</Text>
              <Text style={styles.sectionSubtitle}>Đối chiếu hàng thực tế trước khi xác nhận</Text>
            </View>
            <Text numeric style={styles.itemCount}>{task.items.length} mặt hàng</Text>
          </View>

          <View style={styles.productList}>
            {task.items.map((item, index) => (
              <View key={item.marketProductId} style={styles.productCard}>
                <View style={styles.productIndex}>
                  <Text numeric style={styles.productIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.productCopy}>
                  <Text style={styles.productName}>{shortProductCode(item.productId, index + 1)}</Text>
                  <Text numeric numberOfLines={1} style={styles.marketProductCode}>
                    Mã nguồn: {item.marketProductId}
                  </Text>
                </View>
                <View style={styles.quantityBadge}>
                  <Text numeric style={styles.quantityValue}>{formatWeight(item.quantityKg)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.secondary} />
            <Text style={styles.noteText}>
              Xác nhận sẽ chuyển lô từ “Chờ nhận” sang “Đã đến Hub” và cập nhật sức chứa/tồn kho trên hệ thống.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>Tổng dự kiến</Text>
            <Text numeric style={styles.footerValue}>{formatWeight(task.totalQuantityKg)}</Text>
          </View>
          {received ? (
            <Pressable style={styles.doneButton} onPress={() => navigation.goBack()}>
              <Ionicons name="checkmark-circle-outline" size={19} color={Colors.primaryText} />
              <Text style={styles.doneButtonText}>Đã xác nhận · Quay lại</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.confirmButton, submitting && styles.buttonDisabled]}
              disabled={submitting}
              onPress={requestConfirmation}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Ionicons name="scan-outline" size={19} color={Colors.onPrimary} />
              )}
              <Text style={styles.confirmButtonText}>
                {submitting ? 'Đang xác nhận...' : 'Xác nhận nhận hàng'}
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
  productIndex: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIndexText: { color: Colors.primaryText, fontSize: 13, fontFamily: Fonts.monoBold },
  productCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  productName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  marketProductCode: { fontSize: 8, fontFamily: Fonts.monoRegular, color: Colors.textMuted, marginTop: 3 },
  quantityBadge: { borderRadius: 9, backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 9, paddingVertical: 7 },
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
