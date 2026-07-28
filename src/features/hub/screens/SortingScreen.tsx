import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import {
  isInboundReceived,
  type HubOrderLineDto,
  type HubRestaurantOrdersDto,
} from '../api/hubApi';
import {
  hubDispatchApi,
  type HubDispatchRouteDto,
  type HubSortingProgressDto,
} from '../api/hubDispatchApi';
import { useHubDispatch } from '../hooks/useHubDispatch';
import { useHubProcurementWeek } from '../hooks/useHubProcurementWeek';
import { useHubSortingWeek } from '../hooks/useHubSortingWeek';
import { useHubWork } from '../hooks/useHubWork';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

type RouteAssignment = {
  route: HubDispatchRouteDto;
  hubId: string;
  stopOrder: number;
  restaurantId: string;
};

type RestaurantRoute = {
  assignment: RouteAssignment | null;
  ambiguous: boolean;
};

const sessionSortedItemIds = new Set<string>();

function shortCode(prefix: string, value: string): string {
  return `${prefix}-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function groupLinesByOrder(lines: HubOrderLineDto[]): Map<string, HubOrderLineDto[]> {
  const result = new Map<string, HubOrderLineDto[]>();
  lines.forEach((line) => {
    const orderLines = result.get(line.orderId) ?? [];
    orderLines.push(line);
    result.set(line.orderId, orderLines);
  });
  return result;
}

function resolveHubId(
  route: HubDispatchRouteDto,
  hubs: { hubId: string; marketId: string | null }[],
): string | null {
  const marketIds = new Set(
    route.stops.filter((stop) => stop.entityType === 'market').map((stop) => stop.entityId),
  );
  return hubs.find((hub) => hub.marketId && marketIds.has(hub.marketId))?.hubId ?? null;
}

function getRestaurantRoute(
  restaurant: HubRestaurantOrdersDto,
  assignmentsByItemId: ReadonlyMap<string, RouteAssignment[]>,
): RestaurantRoute {
  const assignments = restaurant.lines.flatMap((line) => assignmentsByItemId.get(line.orderItemId) ?? []);
  const uniqueRoutes = new Map(assignments.map((assignment) => [assignment.route.id, assignment]));
  return {
    assignment: uniqueRoutes.size === 1 ? [...uniqueRoutes.values()][0] : null,
    ambiguous: uniqueRoutes.size > 1,
  };
}

export function SortingScreen() {
  const navigation = useNavigation<Navigation>();
  const hubWork = useHubWork();
  const procurement = useHubProcurementWeek(hubWork.assignedHubs);
  const sorting = useHubSortingWeek(hubWork.assignedHubs);
  const dispatch = useHubDispatch(hubWork.assignedHubs, true);
  const [sortingByItemId, setSortingByItemId] = useState<Record<string, HubSortingProgressDto>>({});
  const [localSortedItems, setLocalSortedItems] = useState(() => new Set(sessionSortedItemIds));
  const [savingItems, setSavingItems] = useState(new Set<string>());
  const [progressError, setProgressError] = useState<string | null>(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);

  const routes = useMemo(
    () => (dispatch.plan?.routes ?? []).filter((item) => item.manifest.stops.length > 0),
    [dispatch.plan],
  );
  const assignmentsByItemId = useMemo(() => {
    const result = new Map<string, RouteAssignment[]>();
    routes.forEach(({ route, manifest }) => {
      const hubId = resolveHubId(route, hubWork.assignedHubs);
      if (!hubId) return;
      manifest.stops.forEach((stop) => {
        stop.lines.forEach((line) => {
          const assignments = result.get(line.orderItemId) ?? [];
          if (!assignments.some((item) => item.route.id === route.id)) {
            assignments.push({
              route,
              hubId,
              stopOrder: stop.stopOrder,
              restaurantId: stop.restaurantId,
            });
          }
          result.set(line.orderItemId, assignments);
        });
      });
    });
    return result;
  }, [routes, hubWork.assignedHubs]);

  const verifiedOrderKeys = useMemo(() => {
    const receivedBatchKeys = new Set(hubWork.inboundTasks.flatMap((task) => (
      isInboundReceived(task.status) && task.deliveryScheduleId
        ? [`${task.hubId}:${task.deliveryScheduleId}`]
        : []
    )));
    return new Set(procurement.plans.flatMap((plan) => (
      plan.batches.flatMap((batch) => (
        receivedBatchKeys.has(`${plan.hubId}:${batch.batchId}`)
          ? batch.orderIds.map((orderId) => `${plan.hubId}:${orderId}`)
          : []
      ))
    )));
  }, [hubWork.inboundTasks, procurement.plans]);
  const plans = useMemo(() => sorting.plans.flatMap((plan) => {
    const restaurants = plan.restaurants.flatMap((restaurant) => {
      const lines = restaurant.lines.filter((line) => (
        verifiedOrderKeys.has(`${plan.hubId}:${line.orderId}`)
      ));
      if (lines.length === 0) return [];
      return [{
        ...restaurant,
        orderCount: new Set(lines.map((line) => line.orderId)).size,
        lines,
      }];
    });
    return restaurants.length > 0 ? [{ ...plan, restaurants }] : [];
  }), [sorting.plans, verifiedOrderKeys]);
  const allLines = useMemo(() => plans.flatMap((plan) => (
    plan.restaurants.flatMap((restaurant) => restaurant.lines)
  )), [plans]);
  const allLineIds = useMemo(() => [...new Set(allLines.map((line) => line.orderItemId))], [allLines]);
  const orderCount = useMemo(() => new Set(allLines.map((line) => line.orderId)).size, [allLines]);
  const restaurantCount = plans.reduce((sum, plan) => (
    sum + plan.restaurants.filter((restaurant) => restaurant.lines.length > 0).length
  ), 0);
  const routedLineCount = allLineIds.filter((itemId) => (
    assignmentsByItemId.get(itemId)?.length === 1
  )).length;
  const checkedCount = allLineIds.filter((itemId) => (
    sortingByItemId[itemId]?.status.toUpperCase() === 'SORTED' || localSortedItems.has(itemId)
  )).length;
  const progress = allLineIds.length === 0 ? 0 : Math.round((checkedCount / allLineIds.length) * 100);
  const sortingComplete = allLineIds.length > 0 && checkedCount === allLineIds.length;
  const routingComplete = allLineIds.length > 0 && routedLineCount === allLineIds.length;

  const refresh = async () => {
    await Promise.allSettled([
      hubWork.refresh(),
      procurement.refresh(),
      sorting.refresh(),
      dispatch.refresh(),
    ]);
  };

  useEffect(() => {
    let active = true;
    const loadProgress = async () => {
      if (routes.length === 0) {
        if (active) {
          setSortingByItemId({});
          setProgressError(null);
        }
        return;
      }
      const results = await Promise.allSettled(routes.map(async ({ route }) => {
        const hubId = resolveHubId(route, hubWork.assignedHubs);
        if (!hubId) {
          throw new Error(`Không xác định được Hub của ${shortCode('TUYẾN', route.id)}.`);
        }
        return hubDispatchApi.getSortingProgress(hubId, route.id);
      }));
      if (!active) return;
      const next: Record<string, HubSortingProgressDto> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          result.value.forEach((item) => { next[item.orderItemId] = item; });
        }
      });
      setSortingByItemId(next);
      const failed = results.filter((result) => result.status === 'rejected').length;
      setProgressError(failed > 0
        ? `Không tải được tiến độ của ${failed}/${results.length} tuyến.`
        : null);
    };
    void loadProgress();
    return () => { active = false; };
  }, [routes, hubWork.assignedHubs]);

  const markSorted = async (line: HubOrderLineDto) => {
    const serverSorted = sortingByItemId[line.orderItemId]?.status.toUpperCase() === 'SORTED';
    if (serverSorted || savingItems.has(line.orderItemId)) return;
    const assignments = assignmentsByItemId.get(line.orderItemId) ?? [];

    if (assignments.length !== 1) {
      sessionSortedItemIds.add(line.orderItemId);
      setLocalSortedItems(new Set(sessionSortedItemIds));
      if (assignments.length > 1) {
        Alert.alert(
          'Dòng hàng thuộc nhiều tuyến',
          'App đã tạm ghi nhận trong phiên. Cần BE hoặc Điều phối xử lý tuyến trùng trước khi đồng bộ tiến độ.',
        );
      }
      return;
    }

    const assignment = assignments[0];
    setSavingItems((current) => new Set(current).add(line.orderItemId));
    try {
      const saved = await hubDispatchApi.markLineSorted(
        assignment.hubId,
        assignment.route.id,
        line.orderItemId,
        line.quantity,
      );
      setSortingByItemId((current) => ({ ...current, [line.orderItemId]: saved }));
      sessionSortedItemIds.delete(line.orderItemId);
      setLocalSortedItems(new Set(sessionSortedItemIds));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert(
        'Không thể lưu phân loại',
        message ?? 'Vui lòng kiểm tra lại dòng hàng và thử lại.',
      );
    } finally {
      setSavingItems((current) => {
        const next = new Set(current);
        next.delete(line.orderItemId);
        return next;
      });
    }
  };

  if ((hubWork.loading || procurement.loading || sorting.loading) && plans.length === 0) {
    return <Loading label="Đang tải đơn cần phân loại..." />;
  }

  if (hubWork.error && hubWork.assignedHubs.length === 0) {
    return <ErrorView message={hubWork.error} onRetry={hubWork.refresh} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CHỈ HIỆN ĐƠN THUỘC LÔ ĐÃ KIỂM ĐẾM</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Phân hàng theo nhà hàng</Text>
              <Text style={styles.subtitle}>
                {orderCount} đơn · {restaurantCount} nhà hàng · {routedLineCount}/{allLineIds.length} dòng có tuyến
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text numeric style={styles.progressValue}>{progress}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Summary icon="restaurant-outline" value={`${restaurantCount}`} label="nhà hàng" />
          <Summary icon="receipt-outline" value={`${orderCount}`} label="đơn hàng" />
          <Summary icon="checkbox-outline" value={`${checkedCount}/${allLineIds.length}`} label="mặt hàng" />
        </View>

        {sorting.error ? <ErrorView message={sorting.error} onRetry={refresh} /> : null}
        {procurement.error ? <ErrorView message={procurement.error} onRetry={refresh} /> : null}
        {sorting.warnings.map((warning) => (
          <ErrorView key={warning} message={warning} onRetry={refresh} />
        ))}
        {dispatch.error && plans.length > 0 ? (
          <ErrorView message={`Chưa tải được dữ liệu tuyến: ${dispatch.error}`} onRetry={refresh} />
        ) : null}
        {dispatch.plan?.warnings?.map((warning) => (
          <ErrorView key={warning} message={warning} onRetry={refresh} />
        ))}
        {progressError ? <ErrorView message={progressError} onRetry={refresh} /> : null}

        {!sorting.error && !procurement.error && hubWork.assignedHubs.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="business-outline" size={52} color={Colors.textMuted} />}
            title="Chưa được phân công Hub"
            subtitle="Danh sách phân loại sẽ xuất hiện sau khi Admin gán Hub cho tài khoản của bạn."
          />
        ) : !sorting.error && !procurement.error && plans.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="checkmark-done-circle-outline" size={52} color={Colors.primaryText} />}
            title="Chưa có lô đã kiểm đếm để phân hàng"
            subtitle="Đơn chỉ xuất hiện sau khi Hub Staff đối chiếu đủ mặt hàng và xác nhận nhận lô. Không bắt buộc phải có tuyến giao."
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={(
              <RefreshControl
                refreshing={hubWork.refreshing || procurement.refreshing || sorting.refreshing || dispatch.refreshing}
                onRefresh={refresh}
                colors={[Colors.primaryText]}
                tintColor={Colors.primary}
              />
            )}
          >
            <View style={styles.instructionStrip}>
              <Ionicons name="information-circle-outline" size={17} color={Colors.secondary} />
              <Text style={styles.instructionText}>
                Danh sách này chỉ lấy đơn thuộc lô đã xác nhận “Đã đến Hub”. Dòng có tuyến sẽ lưu lên BE; dòng chưa có tuyến được tạm giữ trong phiên App.
              </Text>
            </View>

            {plans.map((plan) => {
              const restaurants = plan.restaurants
                .filter((restaurant) => restaurant.lines.length > 0)
                .map((restaurant) => ({
                  restaurant,
                  routeInfo: getRestaurantRoute(restaurant, assignmentsByItemId),
                }))
                .sort((left, right) => (
                  (left.routeInfo.assignment?.stopOrder ?? Number.MAX_SAFE_INTEGER)
                  - (right.routeInfo.assignment?.stopOrder ?? Number.MAX_SAFE_INTEGER)
                  || left.restaurant.restaurantName.localeCompare(right.restaurant.restaurantName)
                ));

              return (
                <View key={`${plan.hubId}-${plan.serviceDate}`} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View>
                      <Text style={styles.dayTitle}>{formatDate(plan.serviceDate)}</Text>
                      <Text style={styles.hubName}>{plan.hub.name}</Text>
                    </View>
                    <Text numeric style={styles.dayCount}>{restaurants.length} nhà hàng</Text>
                  </View>

                  {restaurants.map(({ restaurant, routeInfo }) => {
                    const groupKey = `${plan.hubId}:${plan.serviceDate}:${restaurant.restaurantId}`;
                    const orderGroups = groupLinesByOrder(restaurant.lines);
                    const groupChecked = restaurant.lines.filter((line) => (
                      sortingByItemId[line.orderItemId]?.status.toUpperCase() === 'SORTED'
                      || localSortedItems.has(line.orderItemId)
                    )).length;
                    const complete = groupChecked === restaurant.lines.length;
                    const expanded = expandedRestaurant === groupKey;
                    const routeLabel = routeInfo.ambiguous
                      ? 'Nhiều tuyến'
                      : routeInfo.assignment
                        ? `#${routeInfo.assignment.stopOrder}`
                        : 'Chờ tuyến';

                    return (
                      <View key={groupKey} style={[styles.groupCard, complete && styles.groupCardComplete]}>
                        <Pressable
                          style={styles.groupHeader}
                          onPress={() => setExpandedRestaurant(expanded ? null : groupKey)}
                        >
                          <View style={[styles.slotBadge, complete && styles.slotBadgeComplete]}>
                            <Text numeric style={[styles.slotText, complete && styles.slotTextComplete]}>
                              {routeLabel}
                            </Text>
                          </View>
                          <View style={styles.groupCopy}>
                            <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.restaurantName}</Text>
                            <Text style={styles.orderMeta}>
                              {restaurant.orderCount} đơn · {restaurant.lines.length} mặt hàng
                              {routeInfo.assignment ? ` · ${shortCode('TUYẾN', routeInfo.assignment.route.id)}` : ''}
                            </Text>
                          </View>
                          <View style={styles.groupStatus}>
                            <Text numeric style={[styles.groupProgress, complete && styles.groupProgressComplete]}>
                              {groupChecked}/{restaurant.lines.length}
                            </Text>
                            <Ionicons
                              name={expanded ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={Colors.textMuted}
                            />
                          </View>
                        </Pressable>

                        {expanded ? (
                          <View style={styles.ordersList}>
                            {[...orderGroups.entries()].map(([orderId, lines], orderIndex) => (
                              <View key={orderId} style={styles.orderCard}>
                                <View style={styles.orderHeader}>
                                  <Text numeric style={styles.orderCode}>{shortCode('ĐH', orderId)}</Text>
                                  <Text numeric style={styles.orderIndex}>Đơn {orderIndex + 1}/{orderGroups.size}</Text>
                                </View>
                                {lines.map((line) => {
                                  const serverSorted = sortingByItemId[line.orderItemId]?.status.toUpperCase() === 'SORTED';
                                  const locallySorted = !serverSorted && localSortedItems.has(line.orderItemId);
                                  const checked = serverSorted || locallySorted;
                                  const saving = savingItems.has(line.orderItemId);
                                  const canSync = assignmentsByItemId.get(line.orderItemId)?.length === 1;
                                  return (
                                    <Pressable
                                      key={line.orderItemId}
                                      style={styles.itemRow}
                                      disabled={serverSorted || saving}
                                      onPress={() => void markSorted(line)}
                                    >
                                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                        {saving ? (
                                          <ActivityIndicator size="small" color={Colors.onPrimary} />
                                        ) : checked ? (
                                          <Ionicons name="checkmark" size={15} color={Colors.onPrimary} />
                                        ) : null}
                                      </View>
                                      <View style={styles.itemCopy}>
                                        <Text style={[styles.itemName, checked && styles.itemNameChecked]}>{line.productName}</Text>
                                        <Text numeric style={styles.itemQuantity}>
                                          {formatQuantity(line.quantity)} {line.unit?.trim() || 'đơn vị'}
                                          {line.capacityKg !== null ? ` · ${formatQuantity(line.capacityKg)} kg tải` : ''}
                                        </Text>
                                        {locallySorted ? (
                                          <Text style={styles.temporaryText}>
                                            {canSync ? 'Chạm lại để đồng bộ lên BE' : 'Tạm ghi nhận trên App · chờ tuyến'}
                                          </Text>
                                        ) : null}
                                      </View>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            <Pressable
              style={[
                styles.dispatchButton,
                (!sortingComplete || !routingComplete) && styles.dispatchButtonDisabled,
              ]}
              disabled={!sortingComplete || !routingComplete}
              onPress={() => navigation.navigate('MarketDispatch')}
            >
              <Ionicons name="car-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.dispatchButtonText}>
                {!sortingComplete
                  ? `Còn ${allLineIds.length - checkedCount} mặt hàng chưa phân loại`
                  : !routingComplete
                    ? 'Đã phân loại · chờ tuyến giao'
                    : 'Mở kế hoạch phân xe'}
              </Text>
            </Pressable>
            <Text style={styles.disabledHint}>
              Chỉ mở phân xe khi mọi mặt hàng đã phân loại và có đúng một tuyến giao.
            </Text>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Summary({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon} size={17} color={Colors.secondary} />
      <View>
        <Text numeric style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1 },
  header: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 14 },
  eyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 0.7, color: Colors.primaryText },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  progressCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  progressValue: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: Colors.surfaceContainerHigh, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: Colors.primary },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 12 },
  summaryItem: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: Colors.border, borderRadius: 11, backgroundColor: Colors.surface, padding: 9 },
  summaryValue: { fontSize: 10, fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  summaryLabel: { fontSize: 8, color: Colors.textMuted, marginTop: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 28, gap: 13 },
  instructionStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, backgroundColor: Colors.secondaryContainer, padding: 10 },
  instructionText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  daySection: { gap: 9 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  dayTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, textTransform: 'capitalize' },
  hubName: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  dayCount: { fontSize: 9, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  groupCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  groupCardComplete: { borderColor: Colors.primary },
  groupHeader: { minHeight: 66, padding: 11, flexDirection: 'row', alignItems: 'center' },
  slotBadge: { minWidth: 50, height: 42, borderRadius: 8, paddingHorizontal: 6, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  slotBadgeComplete: { backgroundColor: Colors.primaryLight },
  slotText: { fontSize: 9, fontFamily: Fonts.monoBold, color: Colors.textSecondary },
  slotTextComplete: { color: Colors.primaryText },
  groupCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  restaurantName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  orderMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  groupStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupProgress: { fontSize: 9, fontFamily: Fonts.monoBold, color: Colors.textMuted },
  groupProgressComplete: { color: Colors.primaryText },
  ordersList: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh, padding: 10, gap: 9 },
  orderCard: { borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderCode: { fontSize: 10, fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  orderIndex: { fontSize: 8, fontFamily: Fonts.monoRegular, color: Colors.textMuted },
  itemRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemCopy: { flex: 1, paddingHorizontal: 9, paddingVertical: 7 },
  itemName: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },
  itemNameChecked: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  itemQuantity: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textMuted, marginTop: 2 },
  temporaryText: { fontSize: 8, color: Colors.warning, marginTop: 3 },
  dispatchButton: { height: 48, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  dispatchButtonDisabled: { opacity: 0.45 },
  dispatchButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  disabledHint: { textAlign: 'center', fontSize: 9, lineHeight: 14, color: Colors.textMuted, marginTop: -3 },
});
