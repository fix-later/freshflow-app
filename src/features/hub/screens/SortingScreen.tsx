import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import {
  hubDispatchApi,
  type HubDispatchRouteDto,
  type HubSortingProgressDto,
  type LoadingOrderDto,
  type LoadingStopDto,
} from '../api/hubDispatchApi';
import { useHubDispatch } from '../hooks/useHubDispatch';
import { useHubWork } from '../hooks/useHubWork';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

function shortCode(prefix: string, value: string): string {
  return `${prefix}-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function getOrders(stop: LoadingStopDto): LoadingOrderDto[] {
  const grouped = new Map<string, LoadingOrderDto>();
  stop.lines.forEach((line) => {
    const order = grouped.get(line.orderId) ?? { orderId: line.orderId, lines: [] };
    order.lines.push(line);
    grouped.set(line.orderId, order);
  });
  return [...grouped.values()];
}

function resolveHubId(route: HubDispatchRouteDto, hubs: { hubId: string; marketId: string | null }[]): string | null {
  const marketIds = new Set(
    route.stops.filter((stop) => stop.entityType === 'market').map((stop) => stop.entityId),
  );
  return hubs.find((hub) => hub.marketId && marketIds.has(hub.marketId))?.hubId ?? null;
}

export function SortingScreen() {
  const navigation = useNavigation<Navigation>();
  const hubWork = useHubWork();
  const dispatch = useHubDispatch(hubWork.assignedHubs, true);
  const [sortingByItemId, setSortingByItemId] = useState<Record<string, HubSortingProgressDto>>({});
  const [savingItems, setSavingItems] = useState(new Set<string>());
  const [progressError, setProgressError] = useState<string | null>(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);

  const candidateRoutes = dispatch.plan?.routes ?? [];
  const routes = candidateRoutes.filter((item) => item.manifest.stops.length > 0);
  const allLineIds = useMemo(() => [...new Set(routes.flatMap(({ manifest }) => (
    manifest.stops.flatMap((stop) => getOrders(stop).flatMap((order) => (
      order.lines.map((line) => line.orderItemId)
    )))
  )))], [routes]);
  const validLineIds = new Set(allLineIds);
  const checkedCount = Object.values(sortingByItemId).filter((item) => (
    validLineIds.has(item.orderItemId) && item.status.toUpperCase() === 'SORTED'
  )).length;
  const restaurantCount = routes.reduce((sum, item) => sum + item.manifest.stops.length, 0);
  const orderCount = routes.reduce((sum, item) => (
    sum + item.manifest.stops.reduce((stopSum, stop) => stopSum + getOrders(stop).length, 0)
  ), 0);
  const progress = allLineIds.length === 0 ? 0 : Math.round((checkedCount / allLineIds.length) * 100);
  const sortingComplete = allLineIds.length > 0 && checkedCount === allLineIds.length;

  const refresh = async () => {
    await hubWork.refresh();
    await dispatch.refresh();
  };

  useEffect(() => {
    let active = true;
    const loadProgress = async () => {
      if (routes.length === 0) {
        if (active) setSortingByItemId({});
        return;
      }
      const results = await Promise.allSettled(routes.map(async ({ route }) => {
        const hubId = resolveHubId(route, hubWork.assignedHubs);
        if (!hubId) throw new Error(`Không xác định được Hub của ${shortCode('TUYẾN', route.id)}.`);
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
      setProgressError(failed > 0 ? `Không tải được tiến độ của ${failed}/${results.length} tuyến.` : null);
    };
    void loadProgress();
    return () => { active = false; };
  }, [dispatch.plan, hubWork.assignedHubs]);

  const markSorted = async (route: HubDispatchRouteDto, orderItemId: string, quantity: number) => {
    if (sortingByItemId[orderItemId]?.status.toUpperCase() === 'SORTED' || savingItems.has(orderItemId)) return;
    const hubId = resolveHubId(route, hubWork.assignedHubs);
    if (!hubId) {
      Alert.alert('Không xác định được Hub', 'Tuyến không có điểm Market khớp với Hub được gán cho tài khoản này.');
      return;
    }
    setSavingItems((current) => new Set(current).add(orderItemId));
    try {
      const saved = await hubDispatchApi.markLineSorted(hubId, route.id, orderItemId, quantity);
      setSortingByItemId((current) => ({ ...current, [orderItemId]: saved }));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Không thể lưu phân loại', message ?? 'Vui lòng kiểm tra lại dòng hàng và thử lại.');
    } finally {
      setSavingItems((current) => {
        const next = new Set(current);
        next.delete(orderItemId);
        return next;
      });
    }
  };

  if ((hubWork.loading || dispatch.loading) && !dispatch.plan) {
    return <Loading label="Đang tải đơn cần phân loại..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>DỮ LIỆU THỰC TỪ KẾ HOẠCH GIAO</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Phân hàng theo nhà hàng</Text>
              <Text style={styles.subtitle}>{orderCount} đơn · {restaurantCount} nhà hàng · {routes.length} tuyến</Text>
            </View>
            <View style={styles.progressCircle}><Text numeric style={styles.progressValue}>{progress}%</Text></View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        <View style={styles.summaryRow}>
          <Summary icon="restaurant-outline" value={`${restaurantCount}`} label="nhà hàng" />
          <Summary icon="receipt-outline" value={`${orderCount}`} label="đơn hàng" />
          <Summary icon="checkbox-outline" value={`${checkedCount}/${allLineIds.length}`} label="mặt hàng" />
        </View>

        {dispatch.error ? <ErrorView message={dispatch.error} onRetry={refresh} /> : null}
        {dispatch.plan?.warnings?.map((warning) => (
          <ErrorView key={warning} message={warning} onRetry={refresh} />
        ))}
        {progressError ? <ErrorView message={progressError} onRetry={refresh} /> : null}

        {!dispatch.error && routes.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="layers-outline" size={56} color={Colors.textMuted} />}
            title={candidateRoutes.length === 0 ? 'Chưa có tuyến giao cho Hub' : 'Có tuyến nhưng chưa có đơn AtHub'}
            subtitle={candidateRoutes.length === 0
              ? 'App đã kiểm tra toàn bộ ngày nhưng không tìm thấy route có điểm Market khớp với Hub được gán.'
              : `Đã tìm thấy ${candidateRoutes.length} tuyến, nhưng loading-manifest không có đơn trạng thái AtHub cho các nhà hàng trên tuyến.`}
            actionLabel="Tải lại"
            onAction={refresh}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={hubWork.refreshing || dispatch.refreshing} onRefresh={refresh} />}
          >
            <View style={styles.instructionStrip}>
              <Ionicons name="scan-outline" size={18} color={Colors.primaryText} />
              <Text style={styles.instructionText}>Danh sách xếp theo thứ tự giao. Mở từng nhà hàng, đối chiếu từng đơn rồi đánh dấu mặt hàng đã đặt đúng khu vực.</Text>
            </View>

            {routes.map(({ route, manifest }) => {
              const deliveryStops = [...manifest.stops].sort((left, right) => left.stopOrder - right.stopOrder);
              return (
                <View key={route.id} style={styles.routeSection}>
                <View style={styles.routeHeader}>
                  <View>
                    <Text numeric style={styles.routeCode}>{shortCode('TUYẾN', route.id)}</Text>
                    <Text style={styles.routeMeta}>{route.serviceDate} · {manifest.stops.length} điểm giao</Text>
                  </View>
                  <View style={styles.routeStatus}><Text style={styles.routeStatusText}>{route.status}</Text></View>
                </View>

                {deliveryStops.map((stop) => {
                  const restaurantKey = `${route.id}:${stop.restaurantId}`;
                  const expanded = expandedRestaurant === restaurantKey;
                  const orders = getOrders(stop);
                  const stopLineIds = orders.flatMap((order) => (
                    order.lines.map((line) => line.orderItemId)
                  ));
                  const stopChecked = stopLineIds.filter((id) => sortingByItemId[id]?.status.toUpperCase() === 'SORTED').length;
                  const complete = stopLineIds.length > 0 && stopChecked === stopLineIds.length;

                  return (
                    <View key={restaurantKey} style={[styles.groupCard, complete && styles.groupCardComplete]}>
                      <Pressable style={styles.groupHeader} onPress={() => setExpandedRestaurant(expanded ? null : restaurantKey)}>
                        <View style={[styles.slotBadge, complete && styles.slotBadgeComplete]}>
                          <Text numeric style={[styles.slotText, complete && styles.slotTextComplete]}>#{stop.stopOrder}</Text>
                        </View>
                        <View style={styles.groupCopy}>
                          <Text style={styles.restaurantName}>{stop.restaurantName}</Text>
                          <Text style={styles.orderMeta}>{orders.length} đơn · {stopLineIds.length} dòng hàng</Text>
                        </View>
                        <View style={styles.groupStatus}>
                          <Text numeric style={[styles.groupProgress, complete && styles.groupProgressComplete]}>{stopChecked}/{stopLineIds.length}</Text>
                          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                        </View>
                      </Pressable>

                      {expanded ? (
                        <View style={styles.ordersList}>
                          {orders.map((order, orderIndex) => {
                            return (
                              <View key={order.orderId} style={styles.orderCard}>
                                <View style={styles.orderHeader}>
                                  <Text numeric style={styles.orderCode}>
                                    {shortCode('ĐH', order.orderId)}
                                  </Text>
                                  <Text numeric style={styles.orderIndex}>Đơn {orderIndex + 1}/{orders.length}</Text>
                                </View>
                                {order.lines.map((line) => {
                                  const id = line.orderItemId;
                                  const checked = sortingByItemId[id]?.status.toUpperCase() === 'SORTED';
                                  const saving = savingItems.has(id);
                                  return (
                                    <Pressable key={id} disabled={checked || saving} style={styles.itemRow} onPress={() => void markSorted(route, id, line.quantity)}>
                                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                        {saving ? <ActivityIndicator size="small" color={Colors.primaryText} /> : checked ? <Ionicons name="checkmark" size={15} color={Colors.onPrimary} /> : null}
                                      </View>
                                      <View style={styles.itemCopy}>
                                        <Text style={[styles.itemName, checked && styles.itemNameChecked]}>{line.productName}</Text>
                                        <Text numeric style={styles.itemQuantity}>
                                          {formatQuantity(line.quantity)} {line.unit?.trim() || 'đơn vị'}
                                          {line.capacityKg !== null ? ` · quy cách ${formatQuantity(line.capacityKg)} kg/kiện` : ''}
                                        </Text>
                                      </View>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                </View>
              );
            })}

            <Pressable
              disabled={!sortingComplete}
              style={[styles.dispatchButton, !sortingComplete && styles.dispatchButtonDisabled]}
              onPress={() => navigation.navigate('MarketDispatch')}
            >
              <Ionicons name="car-outline" size={19} color={Colors.onPrimary} />
              <Text style={styles.dispatchButtonText}>
                {sortingComplete ? 'Mở kế hoạch phân xe' : `Còn ${allLineIds.length - checkedCount} mặt hàng chưa phân loại`}
              </Text>
              <Ionicons name="arrow-forward" size={17} color={Colors.onPrimary} />
            </Pressable>
            <Text style={styles.disabledHint}>Tiến độ phân loại được lưu trên hệ thống theo từng orderItemId và được khôi phục khi mở lại màn hình.</Text>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Summary({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return <View style={styles.summaryItem}><Ionicons name={icon} size={17} color={Colors.primaryText} /><Text numeric style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.deepTeal },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.deepTeal, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '800' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  title: { color: Colors.white, fontSize: 19, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 4 },
  progressCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: Colors.white, fontSize: 13, fontWeight: '800', fontFamily: Fonts.monoBold },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  summaryRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 13, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingVertical: 11 },
  summaryItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.surfaceContainerHigh },
  summaryValue: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.textPrimary, marginTop: 3 },
  summaryLabel: { fontSize: 8, color: Colors.textMuted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  instructionStrip: { borderRadius: 12, backgroundColor: Colors.primaryLight, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  instructionText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  routeSection: { gap: 9 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  routeCode: { fontSize: 12, fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  routeMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  routeStatus: { borderRadius: 999, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4 },
  routeStatusText: { fontSize: 8, fontWeight: '800', color: Colors.primaryText },
  groupCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  groupCardComplete: { borderColor: Colors.primary },
  groupHeader: { minHeight: 66, padding: 11, flexDirection: 'row', alignItems: 'center' },
  slotBadge: { width: 42, height: 42, borderRadius: 8, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  slotBadgeComplete: { backgroundColor: Colors.primaryLight },
  slotText: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.textSecondary },
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
  legacyHint: { fontSize: 8, color: Colors.warning, marginTop: 7 },
  itemRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemCopy: { flex: 1, paddingHorizontal: 9, paddingVertical: 7 },
  itemName: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },
  itemNameChecked: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  itemQuantity: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textMuted, marginTop: 2 },
  dispatchButton: { height: 48, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  dispatchButtonDisabled: { opacity: 0.45 },
  dispatchButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  disabledHint: { textAlign: 'center', fontSize: 9, lineHeight: 14, color: Colors.textMuted, marginTop: -3 },
});
