import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { useAuth } from '../../auth';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubInboundTask } from '../api/hubApi';
import { useHubDispatch } from '../hooks/useHubDispatch';
import { useHubWork } from '../hooks/useHubWork';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

const CARD_SHADOW = {
  shadowColor: Colors.deepTeal,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 1,
} as const;

function formatWeight(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function shortCode(value: string): string {
  return `IN-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

export function HubDashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const { assignedHubs, inboundTasks, loading, refreshing, error, refresh } = useHubWork();
  const {
    plan: dispatchPlan,
    loading: dispatchLoading,
    refreshing: dispatchRefreshing,
    error: dispatchError,
    refresh: refreshDispatch,
  } = useHubDispatch();
  const displayName = user?.name?.trim() || 'Nhân viên Hub';
  const pendingTasks = inboundTasks.filter((task) => task.status === 'PENDING');
  const receivedTasks = inboundTasks.filter((task) => task.status === 'ARRIVED_AT_HUB');
  const pendingWeight = pendingTasks.reduce((sum, task) => sum + task.totalQuantityKg, 0);
  const todayOrderCount = dispatchPlan?.routes.reduce(
    (sum, item) => sum + item.manifest.stops.length,
    0,
  ) ?? 0;
  const routesWaitingForVehicle = dispatchPlan?.routes.filter(
    ({ route: dispatchRoute }) => dispatchRoute.status === 'reviewed' && !dispatchRoute.vehicleId,
  ).length ?? 0;
  const assignmentLabel = assignedHubs.length === 0
    ? 'Chưa được Admin phân công Hub'
    : assignedHubs.length === 1
      ? assignedHubs[0].name
      : `${assignedHubs.length} Hub được phân công`;

  const openTask = (task: HubInboundTask) => {
    navigation.navigate('CheckIn', { batchId: task.inboundId, assignedTask: task });
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshDispatch()]);
  }, [refresh, refreshDispatch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing || dispatchRefreshing}
            onRefresh={refreshAll}
            colors={[Colors.primaryText]}
            tintColor={Colors.primary}
          />
        )}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.greeting}>Xin chào,</Text>
              <Text numberOfLines={1} style={styles.userName}>{displayName}</Text>
              <Text numberOfLines={1} style={styles.hubName}>{assignmentLabel}</Text>
            </View>
            <View style={styles.assignmentIcon}>
              <Ionicons name="business-outline" size={22} color={Colors.white} />
            </View>
          </View>

          <View style={styles.assignmentSummary}>
            <View style={styles.summaryIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.onPrimary} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>PHẠM VI CÔNG VIỆC</Text>
              <Text style={styles.summaryText}>
                {assignedHubs.length > 0
                  ? 'Chỉ hiển thị các lô thuộc Hub đã được Admin giao cho bạn.'
                  : 'Liên hệ Admin để được gán Hub trước khi nhận hàng.'}
              </Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, assignedHubs.length === 0 && styles.offlineDot]} />
              <Text style={styles.onlineText}>{assignedHubs.length > 0 ? 'Đã đồng bộ' : 'Chờ giao'}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <Loading label="Đang tải công việc được phân công..." />
        ) : error ? (
          <ErrorView message={error} onRetry={refresh} />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <Metric icon="business-outline" value={`${assignedHubs.length}`} label="Hub phụ trách" tone="blue" />
              <Metric icon="file-tray-full-outline" value={`${pendingTasks.length}`} label="Lô chờ nhận" tone="amber" />
              <Metric icon="scale-outline" value={formatWeight(pendingWeight)} label="Kg chờ nhận" tone="green" />
            </View>

            <Pressable style={styles.dispatchOverview} onPress={() => navigation.navigate('MarketDispatch')}>
              <View style={styles.dispatchOverviewIcon}>
                <Ionicons name="car-sport-outline" size={22} color={Colors.primaryText} />
              </View>
              <View style={styles.dispatchOverviewCopy}>
                <Text style={styles.dispatchOverviewTitle}>Đơn và phân xe hôm nay</Text>
                <Text style={styles.dispatchOverviewSub}>
                  {dispatchLoading && !dispatchPlan
                    ? 'Đang đồng bộ kế hoạch giao hàng...'
                    : dispatchError && !dispatchPlan
                      ? 'Chưa tải được kế hoạch · Chạm để thử lại'
                      : `${todayOrderCount} đơn/điểm giao · ${routesWaitingForVehicle} tuyến chờ xe`}
                </Text>
              </View>
              {routesWaitingForVehicle > 0 ? (
                <View style={styles.dispatchCountBadge}>
                  <Text numeric style={styles.dispatchCountText}>{routesWaitingForVehicle}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Hub được Admin phân công</Text>
                <Text style={styles.sectionSubtitle}>Cập nhật trực tiếp từ tài khoản của bạn</Text>
              </View>
            </View>

            {assignedHubs.length === 0 ? (
              <View style={styles.stateCard}>
                <EmptyState
                  icon={<Ionicons name="business-outline" size={52} color={Colors.textMuted} />}
                  title="Bạn chưa được phân công Hub"
                  subtitle="Sau khi Admin gán Hub, các lô hàng cần nhận sẽ tự động xuất hiện tại đây."
                  actionLabel="Kiểm tra lại"
                  onAction={refresh}
                />
              </View>
            ) : (
              <View style={styles.hubList}>
                {assignedHubs.map((hub) => {
                  const usage = hub.capacityKg > 0
                    ? Math.min(100, Math.max(0, (hub.occupiedCapacityKg / hub.capacityKg) * 100))
                    : 0;
                  const hubTaskCount = pendingTasks.filter((task) => task.hubId === hub.hubId).length;

                  return (
                    <View key={hub.hubId} style={styles.hubCard}>
                      <View style={styles.hubCardTop}>
                        <View style={styles.hubIcon}>
                          <Ionicons name="business" size={20} color={Colors.primaryText} />
                        </View>
                        <View style={styles.hubCopy}>
                          <Text numberOfLines={1} style={styles.hubCardName}>{hub.name}</Text>
                          <Text numberOfLines={2} style={styles.hubAddress}>
                            {hub.address || 'Chưa cập nhật địa chỉ'}
                          </Text>
                        </View>
                        <View style={styles.taskCountBadge}>
                          <Text numeric style={styles.taskCountValue}>{hubTaskCount}</Text>
                          <Text style={styles.taskCountLabel}>lô chờ</Text>
                        </View>
                      </View>
                      <View style={styles.capacityLabels}>
                        <Text style={styles.capacityLabel}>Sức chứa đang dùng</Text>
                        <Text numeric style={styles.capacityValue}>
                          {formatWeight(hub.occupiedCapacityKg)} / {formatWeight(hub.capacityKg)} kg
                        </Text>
                      </View>
                      <View style={styles.capacityTrack}>
                        <View style={[styles.capacityFill, { width: `${usage}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {assignedHubs.length > 0 && (
              <>
                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>Task nhận hàng của tôi</Text>
                    <Text style={styles.sectionSubtitle}>
                      {pendingTasks.length} lô chờ nhận · {receivedTasks.length} lô đã đến Hub
                    </Text>
                  </View>
                  <Pressable onPress={() => navigation.navigate('HubTabs', { screen: 'InboundQueue' })}>
                    <Text style={styles.seeAll}>Xem tất cả</Text>
                  </Pressable>
                </View>

                {inboundTasks.length === 0 ? (
                  <View style={styles.stateCard}>
                    <EmptyState
                      icon={<Ionicons name="checkmark-done-circle-outline" size={52} color={Colors.primaryText} />}
                      title="Chưa có lô hàng cần xử lý"
                      subtitle="Khi có lô hàng thuộc Hub được phân công, task sẽ xuất hiện ở đây."
                    />
                  </View>
                ) : (
                  <View style={styles.taskList}>
                    {inboundTasks.slice(0, 4).map((task) => (
                      <TaskCard key={task.inboundId} task={task} onPress={() => openTask(task)} />
                    ))}
                  </View>
                )}

                <View style={styles.quickActions}>
                  <Pressable
                    style={styles.primaryAction}
                    onPress={() => navigation.navigate('HubTabs', { screen: 'InboundQueue' })}
                  >
                    <Ionicons name="file-tray-full-outline" size={19} color={Colors.onPrimary} />
                    <Text style={styles.primaryActionText}>Mở danh sách task</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('IncidentReport')}>
                    <Ionicons name="warning-outline" size={19} color="#8A5900" />
                    <Text style={styles.secondaryActionText}>Báo sự cố</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskCard({ task, onPress }: { task: HubInboundTask; onPress: () => void }) {
  const received = task.status === 'ARRIVED_AT_HUB';

  return (
    <Pressable style={styles.taskCard} onPress={onPress}>
      <View style={[styles.taskIcon, received && styles.taskIconReceived]}>
        <Ionicons name={received ? 'checkmark' : 'cube-outline'} size={21} color={Colors.primaryText} />
      </View>
      <View style={styles.taskCopy}>
        <View style={styles.taskTitleRow}>
          <Text numeric style={styles.taskCode}>{shortCode(task.inboundId)}</Text>
          <View style={[styles.statusBadge, received ? styles.statusReceived : styles.statusPending]}>
            <Text style={[styles.statusText, received ? styles.statusTextReceived : styles.statusTextPending]}>
              {received ? 'Đã đến Hub' : 'Chờ nhận'}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.taskHubName}>{task.hub.name}</Text>
        <Text numeric style={styles.taskMeta}>
          {formatTime(task.arrivedAt)} · {formatWeight(task.totalQuantityKg)} kg · {task.items.length} mặt hàng
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone: 'blue' | 'amber' | 'green';
}) {
  const colors = tone === 'blue'
    ? { color: Colors.secondary, background: '#E8F4FC' }
    : tone === 'amber'
      ? { color: '#8A5900', background: Colors.warningLight }
      : { color: Colors.primaryText, background: Colors.primaryLight };

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={19} color={colors.color} />
      </View>
      <Text numeric numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.deepTeal },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 30 },
  header: {
    backgroundColor: Colors.deepTeal,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  greeting: { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  userName: { color: Colors.white, fontSize: 21, fontWeight: '800', marginTop: 2 },
  hubName: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 4 },
  assignmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentSummary: {
    marginTop: 16,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1, paddingHorizontal: 9 },
  summaryLabel: { color: Colors.white, fontSize: 9, fontWeight: '800' },
  summaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, lineHeight: 13, marginTop: 3 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  offlineDot: { backgroundColor: Colors.warning },
  onlineText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  metricCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 11,
    ...CARD_SHADOW,
  },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: Fonts.monoBold,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  metricLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  dispatchOverview: {
    minHeight: 72,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  dispatchOverviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchOverviewCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  dispatchOverviewTitle: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  dispatchOverviewSub: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  dispatchCountBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  dispatchCountText: { fontSize: 10, fontFamily: Fonts.monoBold, color: '#8A5900' },
  sectionHeading: {
    marginHorizontal: 16,
    marginTop: 21,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  seeAll: { fontSize: 11, fontWeight: '700', color: Colors.primaryText },
  stateCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...CARD_SHADOW,
  },
  hubList: { marginHorizontal: 16, gap: 9 },
  hubCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 13,
    ...CARD_SHADOW,
  },
  hubCardTop: { flexDirection: 'row', alignItems: 'center' },
  hubIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  hubCardName: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  hubAddress: { fontSize: 9, color: Colors.textMuted, lineHeight: 13, marginTop: 3 },
  taskCountBadge: { alignItems: 'center', minWidth: 48 },
  taskCountValue: { fontSize: 16, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  taskCountLabel: { fontSize: 8, color: Colors.textMuted, marginTop: 1 },
  capacityLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  capacityLabel: { fontSize: 9, color: Colors.textMuted },
  capacityValue: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textSecondary },
  capacityTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginTop: 6,
  },
  capacityFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primary600 },
  taskList: { marginHorizontal: 16, gap: 9 },
  taskCard: {
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconReceived: { backgroundColor: Colors.primaryLight },
  taskCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  taskCode: { fontSize: 12, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  taskHubName: { fontSize: 10, color: Colors.textSecondary, marginTop: 3 },
  taskMeta: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textMuted, marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  statusPending: { backgroundColor: Colors.warningLight },
  statusReceived: { backgroundColor: Colors.primaryLight },
  statusText: { fontSize: 8, fontWeight: '800' },
  statusTextPending: { color: '#8A5900' },
  statusTextReceived: { color: Colors.primaryText },
  quickActions: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 },
  primaryAction: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    ...CARD_SHADOW,
  },
  primaryActionText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  secondaryAction: {
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9B967',
    backgroundColor: Colors.warningLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: { color: '#8A5900', fontSize: 11, fontWeight: '800' },
});
