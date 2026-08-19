import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { inventoryApi } from '../../inventory/api/inventoryApi';
import {
  getVietnamDate,
  marketProcurementApi,
  type MarketProcurementTaskDto,
  type ProcurementTaskStatus,
} from '../api/marketProcurementApi';
import { useMarketAgentTaskRealtime } from '../context/MarketAgentTaskRealtimeContext';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import {
  formatQuantityTotal,
  formatQuantityWithUnit,
} from '../../../utils/quantity';

type TaskFilter = 'all' | 'pending' | 'active' | 'completed';

type StatusPresentation = {
  label: string;
  color: string;
  background: string;
};

const STATUS: Record<ProcurementTaskStatus, StatusPresentation> = {
  Built: { label: 'Đang lập phiếu', color: Colors.textMuted, background: Colors.surfaceContainerHigh },
  Manifested: { label: 'Chờ thu mua', color: '#8A5900', background: Colors.warningLight },
  Purchasing: { label: 'Đang thu mua', color: Colors.primaryText, background: Colors.primaryLight },
  HandedOff: { label: 'Đã bàn giao', color: Colors.secondary, background: Colors.secondaryContainer },
  Completed: { label: 'Đã hoàn tất', color: Colors.primaryText, background: Colors.successLight },
  Cancelled: { label: 'Đã huỷ', color: Colors.danger, background: Colors.dangerLight },
};

const UNKNOWN_STATUS: StatusPresentation = {
  label: 'Không xác định',
  color: Colors.textSecondary,
  background: Colors.surfaceContainerHigh,
};

function formatBatchDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(year, month - 1, day));
}

function shortBatchCode(value: string): string {
  return `PO-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function matchesFilter(task: MarketProcurementTaskDto, filter: TaskFilter): boolean {
  if (filter === 'pending') return task.status === 'Built' || task.status === 'Manifested';
  if (filter === 'active') return task.status === 'Purchasing';
  if (filter === 'completed') {
    return task.status === 'HandedOff' || task.status === 'Completed';
  }
  return true;
}

export function MarketAgentTasksScreen() {
  const navigation = useNavigation<any>();
  const {
    isRealtimeConnected,
    latestAssignment,
    revision,
    syncNow,
  } = useMarketAgentTaskRealtime();
  const [tasks, setTasks] = useState<MarketProcurementTaskDto[]>([]);
  const [marketNames, setMarketNames] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedAssignmentId, setDismissedAssignmentId] = useState<string | null>(null);

  const fetchTasks = useCallback(async (showError = true) => {
    try {
      const [taskData, markets] = await Promise.all([
        marketProcurementApi.getTasksInNextSevenDays(getVietnamDate()),
        inventoryApi.getAssignedMarkets(),
      ]);
      setTasks(taskData);
      setMarketNames(new Map(markets.map((market) => [market.marketId, market.name])));
    } catch (error: unknown) {
      if (showError) {
        Alert.alert('Không thể tải nhiệm vụ', getApiErrorMessage(error, 'Vui lòng thử lại sau.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void Promise.all([fetchTasks(true), syncNow()]);
  }, [fetchTasks, syncNow]));

  useEffect(() => {
    if (revision === 0) return;
    void fetchTasks(false);
  }, [fetchTasks, revision]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTasks(true), syncNow()]);
    setRefreshing(false);
  }, [fetchTasks, syncNow]);

  const showNewAssignment = latestAssignment
    && latestAssignment.batchId !== dismissedAssignmentId;

  const summary = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter((task) => matchesFilter(task, 'pending')).length,
    active: tasks.filter((task) => matchesFilter(task, 'active')).length,
    completed: tasks.filter((task) => matchesFilter(task, 'completed')).length,
  }), [tasks]);

  const groups = useMemo(() => {
    const grouped = new Map<string, MarketProcurementTaskDto[]>();
    tasks.filter((task) => matchesFilter(task, filter)).forEach((task) => {
      const current = grouped.get(task.batchDate) ?? [];
      current.push(task);
      grouped.set(task.batchDate, current);
    });
    return Array.from(grouped.entries()).map(([date, dayTasks]) => ({ date, tasks: dayTasks }));
  }, [filter, tasks]);

  if (loading) {
    return (
      <ScreenContainer
        scroll={false}
        safeArea
        edges={['top']}
        bgColor={Colors.background}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
          <Text style={styles.loadingText}>Đang tải nhiệm vụ...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll
      padding={false}
      safeArea
      edges={['top']}
      bgColor={Colors.background}
      style={styles.container}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primaryText]}
          tintColor={Colors.primaryText}
        />
      )}
    >
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <View style={styles.headerKicker}>
          <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
          <Text style={styles.headerKickerText}>KẾ HOẠCH 7 NGÀY</Text>
        </View>
        <Text style={styles.headerTitle}>Nhiệm vụ thu mua</Text>
        <Text style={styles.headerSubtitle}>
          Theo dõi lô được giao, xác nhận số lượng và hoàn tất bàn giao tại một nơi.
        </Text>

        <View style={styles.summaryRow}>
          <SummaryMetric value={summary.all} label="Tổng nhiệm vụ" />
          <View style={styles.summaryDivider} />
          <SummaryMetric value={summary.pending} label="Chờ thực hiện" />
          <View style={styles.summaryDivider} />
          <SummaryMetric value={summary.active} label="Đang thu mua" />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.syncStatusRow}>
          <View style={[
            styles.syncDot,
            { backgroundColor: isRealtimeConnected ? Colors.primary : Colors.warning },
          ]} />
          <Text style={styles.syncStatusText}>
            {isRealtimeConnected ? 'Đang cập nhật trực tiếp' : 'Đang tự kiểm tra mỗi 30 giây'}
          </Text>
        </View>

        {showNewAssignment ? (
          <View style={styles.newTaskBanner}>
            <View style={styles.newTaskIcon}>
              <Ionicons name="notifications" size={19} color={Colors.deepTeal} />
            </View>
            <Pressable
              style={styles.newTaskBody}
              onPress={() => navigation.navigate('ProcurementTaskDetail', {
                batchId: latestAssignment.batchId,
              })}
              accessibilityRole="button"
              accessibilityLabel={`Mở nhiệm vụ mới ${shortBatchCode(latestAssignment.batchId)}`}
            >
              <Text style={styles.newTaskEyebrow}>NHIỆM VỤ MỚI TỪ ADMIN</Text>
              <Text style={styles.newTaskTitle}>
                Bạn vừa được giao {shortBatchCode(latestAssignment.batchId)}
              </Text>
              <Text style={styles.newTaskAction}>Chạm để xem và thực hiện ngay</Text>
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={() => setDismissedAssignmentId(latestAssignment.batchId)}
              accessibilityRole="button"
              accessibilityLabel="Ẩn thông báo nhiệm vụ mới"
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>BỘ LỌC TRẠNG THÁI</Text>
            <Text style={styles.sectionTitle}>Danh sách nhiệm vụ</Text>
          </View>
          <Text style={styles.resultCount} numeric>
            {groups.reduce((count, group) => count + group.tasks.length, 0)} nhiệm vụ
          </Text>
        </View>

        <View style={styles.filters}>
          <FilterChip label="Tất cả" count={summary.all} active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="Chờ mua" count={summary.pending} active={filter === 'pending'} onPress={() => setFilter('pending')} />
          <FilterChip label="Đang mua" count={summary.active} active={filter === 'active'} onPress={() => setFilter('active')} />
          <FilterChip label="Hoàn tất" count={summary.completed} active={filter === 'completed'} onPress={() => setFilter('completed')} />
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-done-outline" size={30} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Không có nhiệm vụ phù hợp</Text>
            <Text style={styles.emptyText}>Thử chọn trạng thái khác hoặc kéo xuống để làm mới.</Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <View key={group.date} style={styles.dayGroup}>
                <View style={styles.dayHeading}>
                  <View style={styles.dayIcon}>
                    <Ionicons name="calendar-clear-outline" size={16} color={Colors.primaryText} />
                  </View>
                  <Text style={styles.dayTitle}>{formatBatchDate(group.date)}</Text>
                  <View style={styles.dayCountPill}>
                    <Text style={styles.dayCountText} numeric>{group.tasks.length} lô</Text>
                  </View>
                </View>

                <View style={styles.taskList}>
                  {group.tasks.map((task) => {
                    const status = STATUS[task.status] ?? UNKNOWN_STATUS;
                    const quantitySummary = formatQuantityTotal(task.items.map((item) => ({
                      quantity: item.totalQuantity,
                      unit: item.unit,
                    })));
                    return (
                      <Pressable
                        key={task.id}
                        style={({ pressed }) => [styles.taskCard, pressed && styles.pressed]}
                        onPress={() => navigation.navigate('ProcurementTaskDetail', { batchId: task.id })}
                        accessibilityRole="button"
                        accessibilityLabel={`Mở nhiệm vụ ${shortBatchCode(task.id)}`}
                      >
                        <View style={styles.taskHeader}>
                          <View style={styles.taskCodeBlock}>
                            <Text style={styles.taskCode} numeric>{shortBatchCode(task.id)}</Text>
                            <View style={styles.marketRow}>
                              <Ionicons name="storefront-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.marketName} numberOfLines={1}>
                                {marketNames.get(task.marketId) || 'Chợ được phân công'}
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                          </View>
                        </View>

                        <View style={styles.taskMetrics}>
                          <TaskMetric icon="receipt-outline" value={`${task.members.length}`} label="đơn" />
                          <TaskMetric icon="cube-outline" value={`${task.items.length}`} label="mặt hàng" />
                          <TaskMetric
                            icon="layers-outline"
                            value={quantitySummary}
                            label="số lượng"
                          />
                        </View>

                        <Text style={styles.productPreview} numberOfLines={2}>
                          {task.items
                            .map((item) => (
                              `${item.productNameSnapshot} ${formatQuantityWithUnit(item.totalQuantity, item.unit)}`
                            ))
                            .join(' · ')}
                        </Text>

                        <View style={styles.openRow}>
                          <Text style={styles.openText}>Xem chi tiết nhiệm vụ</Text>
                          <Ionicons name="arrow-forward" size={15} color={Colors.primaryText} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function SummaryMetric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryValue} numeric>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[styles.filterText, active && styles.filterTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={[styles.filterCount, active && styles.filterCountActive]}>
        <Text style={[styles.filterCountText, active && styles.filterCountTextActive]} numeric>{count}</Text>
      </View>
    </Pressable>
  );
}

function TaskMetric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.taskMetric}>
      <Ionicons name={icon} size={14} color={Colors.primaryText} />
      <Text style={styles.taskMetricValue} numeric>{value}</Text>
      <Text style={styles.taskMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.medium },
  header: {
    minHeight: 276,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    overflow: 'hidden',
    backgroundColor: Colors.deepTeal,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerOrb: {
    position: 'absolute',
    top: -70,
    right: -54,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(80,240,163,0.12)',
  },
  headerKicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerKickerText: { fontSize: 8, letterSpacing: 1.1, color: Colors.primary, fontFamily: Fonts.bold },
  headerTitle: { marginTop: 13, fontSize: 26, color: Colors.white, fontFamily: Fonts.extraBold },
  headerSubtitle: { marginTop: 9, maxWidth: '92%', fontSize: 10, lineHeight: 17, color: '#C8DADD' },
  summaryRow: {
    minHeight: 78,
    marginTop: 24,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryMetric: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, color: Colors.primary, fontFamily: Fonts.monoBold },
  summaryLabel: { marginTop: 4, fontSize: 7, color: Colors.white, fontFamily: Fonts.semibold },
  summaryDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.16)' },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  syncStatusRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncStatusText: { fontSize: 8, color: Colors.textMuted, fontFamily: Fonts.semibold },
  newTaskBanner: {
    marginBottom: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary600,
  },
  newTaskIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  newTaskBody: { flex: 1, minWidth: 0 },
  newTaskEyebrow: { fontSize: 7, letterSpacing: 0.8, color: Colors.primaryText, fontFamily: Fonts.bold },
  newTaskTitle: { marginTop: 3, fontSize: 10, color: Colors.deepTeal, fontFamily: Fonts.bold },
  newTaskAction: { marginTop: 3, fontSize: 8, color: Colors.textSecondary },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { marginBottom: 4, fontSize: 8, letterSpacing: 1, color: Colors.primaryText, fontFamily: Fonts.bold },
  sectionTitle: { fontSize: 19, color: Colors.textPrimary, fontFamily: Fonts.bold },
  resultCount: { fontSize: 9, color: Colors.textMuted, fontFamily: Fonts.monoSemibold },
  filters: { marginTop: 14, flexDirection: 'row', gap: 6 },
  filterChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingLeft: 5,
    paddingRight: 4,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary600 },
  filterText: {
    flexShrink: 1,
    fontSize: 8,
    color: Colors.textSecondary,
    fontFamily: Fonts.semibold,
  },
  filterTextActive: { color: Colors.primaryText, fontFamily: Fonts.bold },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  filterCountActive: { backgroundColor: Colors.primary },
  filterCountText: { fontSize: 8, color: Colors.textSecondary, fontFamily: Fonts.monoBold },
  filterCountTextActive: { color: Colors.deepTeal },
  groupList: { marginTop: 22, gap: 22 },
  dayGroup: { gap: 10 },
  dayHeading: { flexDirection: 'row', alignItems: 'center' },
  dayIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  dayTitle: { flex: 1, paddingHorizontal: 9, fontSize: 11, color: Colors.textPrimary, fontFamily: Fonts.bold },
  dayCountPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: Colors.surface },
  dayCountText: { fontSize: 8, color: Colors.textSecondary, fontFamily: Fonts.monoBold },
  taskList: { gap: 10 },
  taskCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  taskCodeBlock: { flex: 1, minWidth: 0, paddingRight: 8 },
  taskCode: { fontSize: 12, color: Colors.textPrimary, fontFamily: Fonts.monoBold },
  marketRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  marketName: { flex: 1, fontSize: 9, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 7, fontFamily: Fonts.bold },
  taskMetrics: { marginTop: 13, flexDirection: 'row', gap: 7 },
  taskMetric: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: Colors.surfaceContainerLow,
  },
  taskMetricValue: { marginTop: 3, fontSize: 10, color: Colors.deepTeal, fontFamily: Fonts.monoBold },
  taskMetricLabel: { marginTop: 1, fontSize: 7, color: Colors.textMuted },
  productPreview: { marginTop: 11, fontSize: 9, lineHeight: 15, color: Colors.textSecondary },
  openRow: {
    minHeight: 38,
    marginTop: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  openText: { fontSize: 9, color: Colors.primaryText, fontFamily: Fonts.bold },
  emptyCard: {
    marginTop: 24,
    padding: 26,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  emptyTitle: { marginTop: 12, fontSize: 12, color: Colors.textPrimary, fontFamily: Fonts.bold },
  emptyText: { marginTop: 6, fontSize: 9, textAlign: 'center', color: Colors.textMuted },
  pressed: { opacity: 0.72 },
});
