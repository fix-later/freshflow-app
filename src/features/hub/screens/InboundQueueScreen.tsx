import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { isInboundReceived, type HubInboundTask } from '../api/hubApi';
import { useHubWork } from '../hooks/useHubWork';

type Navigation = NativeStackNavigationProp<HubStackParamList>;
type TaskFilter = 'pending' | 'received';

const CARD_SHADOW = {
  shadowColor: Colors.deepTeal,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 1,
} as const;

function shortCode(value: string): string {
  return `IN-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function shortId(value: string | null): string {
  if (!value) return 'Chưa gắn';
  return value.replaceAll('-', '').slice(0, 8).toUpperCase();
}

function shortBatchCode(value: string | null): string {
  if (!value) return 'Chưa gắn';
  return `LO-${shortId(value)}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatWeight(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} kg`;
}

function formatSyncTime(value: Date | null): string {
  if (!value) return 'Chưa đồng bộ';
  return `Đồng bộ lúc ${new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)}`;
}

export function InboundQueueScreen() {
  const navigation = useNavigation<Navigation>();
  const [filter, setFilter] = useState<TaskFilter>('pending');
  const {
    assignedHubs,
    inboundTasks,
    warnings,
    lastSyncedAt,
    loading,
    refreshing,
    error,
    refresh,
  } = useHubWork();
  const pendingTasks = useMemo(
    () => inboundTasks.filter((task) => !isInboundReceived(task.status)),
    [inboundTasks],
  );
  const receivedTasks = useMemo(
    () => inboundTasks.filter((task) => isInboundReceived(task.status)),
    [inboundTasks],
  );
  const visibleTasks = filter === 'pending' ? pendingTasks : receivedTasks;
  const visibleWeight = visibleTasks.reduce((sum, task) => sum + task.totalQuantityKg, 0);

  const openTask = (task: HubInboundTask) => {
    navigation.navigate('CheckIn', { batchId: task.inboundId, assignedTask: task });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TASK ĐƯỢC PHÂN CÔNG · {assignedHubs.length} HUB</Text>
          <Text style={styles.title}>Kiểm đếm lô hàng</Text>
          <Text style={styles.subtitle}>
            {visibleTasks.length} lô · {formatWeight(visibleWeight)} {filter === 'pending' ? 'đang chờ nhận' : 'đã đến Hub'}
          </Text>
          <Text numeric style={styles.syncTime}>{formatSyncTime(lastSyncedAt)}</Text>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={filter === 'pending' ? styles.filterTextActive : styles.filterText}>
              Đang chờ  {pendingTasks.length}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, filter === 'received' && styles.filterChipActive]}
            onPress={() => setFilter('received')}
          >
            <Text style={filter === 'received' ? styles.filterTextActive : styles.filterText}>
              Đã nhận  {receivedTasks.length}
            </Text>
          </Pressable>
          <Pressable accessibilityLabel="Tải lại danh sách task" style={styles.refreshButton} onPress={refresh}>
            <Ionicons name="refresh" size={19} color={Colors.onPrimary} />
          </Pressable>
        </View>

        {warnings.length > 0 ? (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={18} color={Colors.warning} />
            <Text style={styles.warningText}>{warnings.join('\n')}</Text>
          </View>
        ) : null}

        {loading ? (
          <Loading fullScreen label="Đang tải task nhận hàng..." />
        ) : error ? (
          <ErrorView fullScreen message={error} onRetry={refresh} />
        ) : assignedHubs.length === 0 ? (
          <View style={styles.fullState}>
            <EmptyState
              icon={<Ionicons name="business-outline" size={58} color={Colors.textMuted} />}
              title="Bạn chưa được phân công Hub"
              subtitle="Admin cần gán ít nhất một Hub cho tài khoản trước khi bạn có thể nhận task."
              actionLabel="Kiểm tra lại"
              onAction={refresh}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, visibleTasks.length === 0 && styles.emptyList]}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                colors={[Colors.primaryText]}
                tintColor={Colors.primaryText}
              />
            )}
          >
            {visibleTasks.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="checkmark-done-circle-outline" size={58} color={Colors.primaryText} />}
                title={filter === 'pending' ? 'Không có lô hàng đang chờ' : 'Chưa có lô hàng đã nhận'}
                subtitle={filter === 'pending'
                  ? `API pending-inbound đang trả về 0 task cho: ${assignedHubs.map((hub) => `${hub.name} (${shortId(hub.hubId)})`).join(', ')}.`
                  : 'Lô hàng sẽ chuyển sang đây sau khi bạn xác nhận nhận hàng.'}
              />
            ) : (
              visibleTasks.map((task) => (
                <TaskCard key={task.inboundId} task={task} onPress={() => openTask(task)} />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function TaskCard({ task, onPress }: { task: HubInboundTask; onPress: () => void }) {
  const received = isInboundReceived(task.status);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleCopy}>
          <Text numeric style={styles.code}>{shortCode(task.inboundId)}</Text>
          <Text numberOfLines={1} style={styles.hubName}>{task.hub.name}</Text>
          {task.hub.address ? <Text numberOfLines={1} style={styles.hubAddress}>{task.hub.address}</Text> : null}
        </View>
        <View style={[styles.statusBadge, received ? styles.statusReceived : styles.statusPending]}>
          <Text style={[styles.statusText, received ? styles.statusTextReceived : styles.statusTextPending]}>
            {received ? 'Đã đến Hub' : 'Chờ nhận'}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <Info
          icon="time-outline"
          label={task.deliveryScheduleId ? 'MA bàn giao lúc' : 'Thời gian dự kiến'}
          value={formatDateTime(task.arrivedAt)}
          numeric
        />
        <Info icon="scale-outline" label="Khối lượng" value={formatWeight(task.totalQuantityKg)} numeric />
        <Info
          icon={task.deliveryScheduleId ? 'cube-outline' : 'navigate-outline'}
          label={task.deliveryScheduleId ? 'Lô từ MA' : 'Tuyến giao'}
          value={task.deliveryScheduleId ? shortBatchCode(task.deliveryScheduleId) : shortId(task.deliveryRouteId)}
          numeric
        />
        <Info icon="storefront-outline" label="Nguồn hàng" value={shortId(task.sourceMarketId)} numeric />
      </View>

      <View style={styles.cardFooter}>
        <Text numeric style={styles.productCount}>{task.items.length} mặt hàng cần đối chiếu</Text>
        <View style={styles.openAction}>
          <Text style={styles.openActionText}>{received ? 'Xem kết quả' : 'Bắt đầu kiểm đếm'}</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.primaryText} />
        </View>
      </View>
    </Pressable>
  );
}

function Info({
  icon,
  label,
  value,
  numeric = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.primaryText} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text numeric={numeric} numberOfLines={1} style={[styles.infoValue, numeric && styles.infoValueNumeric]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.deepTeal },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.deepTeal,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  title: { color: Colors.white, fontSize: 20, fontWeight: '800', marginTop: 5 },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 4 },
  syncTime: { color: 'rgba(255,255,255,0.58)', fontSize: 8, fontFamily: Fonts.monoRegular, marginTop: 5 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  filterText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { fontSize: 10, fontWeight: '800', color: Colors.primaryText },
  refreshButton: {
    marginLeft: 'auto',
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  list: { paddingHorizontal: 16, paddingBottom: 28, gap: 11 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  fullState: { flex: 1, justifyContent: 'center' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    ...CARD_SHADOW,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleCopy: { flex: 1, minWidth: 0 },
  code: { fontSize: 14, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  hubName: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginTop: 3 },
  hubAddress: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusPending: { backgroundColor: Colors.warningLight },
  statusReceived: { backgroundColor: Colors.primaryLight },
  statusText: { fontSize: 8, fontWeight: '800' },
  statusTextPending: { color: '#8A5900' },
  statusTextReceived: { color: Colors.primaryText },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 11, marginTop: 14 },
  info: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 5 },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 8, color: Colors.textMuted },
  infoValue: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  infoValueNumeric: { fontFamily: Fonts.monoSemibold },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    marginTop: 13,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCount: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textMuted },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openActionText: { fontSize: 10, fontWeight: '800', color: Colors.primaryText },
});
