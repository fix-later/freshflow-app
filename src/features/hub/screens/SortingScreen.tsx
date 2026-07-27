import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import type { LoadingOrderDto, LoadingStopDto } from '../api/hubDispatchApi';
import { useHubDispatch } from '../hooks/useHubDispatch';
import { useHubWork } from '../hooks/useHubWork';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

function shortCode(prefix: string, value: string): string {
  return `${prefix}-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function getOrders(stop: LoadingStopDto): LoadingOrderDto[] {
  if (stop.orders && stop.orders.length > 0) return stop.orders;
  if (stop.lines.length === 0) return [];
  return [{ orderId: `legacy-${stop.restaurantId}`, lines: stop.lines }];
}

function lineId(routeId: string, restaurantId: string, orderId: string, index: number): string {
  return `${routeId}:${restaurantId}:${orderId}:${index}`;
}

export function SortingScreen() {
  const navigation = useNavigation<Navigation>();
  const hubWork = useHubWork();
  const dispatch = useHubDispatch(hubWork.assignedHubs);
  const [checkedItems, setCheckedItems] = useState(new Set<string>());
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);

  const routes = dispatch.plan?.routes.filter((item) => item.manifest.stops.length > 0) ?? [];
  const allLineIds = useMemo(() => routes.flatMap(({ route, manifest }) => (
    manifest.stops.flatMap((stop) => getOrders(stop).flatMap((order) => (
      order.lines.map((_, index) => lineId(route.id, stop.restaurantId, order.orderId, index))
    )))
  )), [routes]);
  const validLineIds = new Set(allLineIds);
  const checkedCount = [...checkedItems].filter((id) => validLineIds.has(id)).length;
  const restaurantCount = routes.reduce((sum, item) => sum + item.manifest.stops.length, 0);
  const orderCount = routes.reduce((sum, item) => (
    sum + item.manifest.stops.reduce((stopSum, stop) => stopSum + getOrders(stop).length, 0)
  ), 0);
  const progress = allLineIds.length === 0 ? 0 : Math.round((checkedCount / allLineIds.length) * 100);

  const refresh = async () => {
    await hubWork.refresh();
    await dispatch.refresh();
  };

  const toggleItem = (id: string) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

        {!dispatch.error && routes.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="layers-outline" size={56} color={Colors.textMuted} />}
            title="Chưa có đơn tại Hub để phân loại"
            subtitle="Đơn ở trạng thái AtHub và thuộc tuyến của Hub sẽ tự động xuất hiện tại đây."
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
              <Text style={styles.instructionText}>Mở từng nhà hàng, đối chiếu từng đơn rồi đánh dấu từng mặt hàng đã đặt đúng khu vực.</Text>
            </View>

            {routes.map(({ route, manifest }) => (
              <View key={route.id} style={styles.routeSection}>
                <View style={styles.routeHeader}>
                  <View>
                    <Text numeric style={styles.routeCode}>{shortCode('TUYẾN', route.id)}</Text>
                    <Text style={styles.routeMeta}>{route.serviceDate} · {manifest.stops.length} điểm giao</Text>
                  </View>
                  <View style={styles.routeStatus}><Text style={styles.routeStatusText}>{route.status}</Text></View>
                </View>

                {manifest.stops.map((stop) => {
                  const restaurantKey = `${route.id}:${stop.restaurantId}`;
                  const expanded = expandedRestaurant === restaurantKey;
                  const orders = getOrders(stop);
                  const stopLineIds = orders.flatMap((order) => order.lines.map((_, index) => (
                    lineId(route.id, stop.restaurantId, order.orderId, index)
                  )));
                  const stopChecked = stopLineIds.filter((id) => checkedItems.has(id)).length;
                  const complete = stopLineIds.length > 0 && stopChecked === stopLineIds.length;

                  return (
                    <View key={restaurantKey} style={[styles.groupCard, complete && styles.groupCardComplete]}>
                      <Pressable style={styles.groupHeader} onPress={() => setExpandedRestaurant(expanded ? null : restaurantKey)}>
                        <View style={[styles.slotBadge, complete && styles.slotBadgeComplete]}>
                          <Text numeric style={[styles.slotText, complete && styles.slotTextComplete]}>Đ{stop.stopOrder}</Text>
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
                            const legacy = order.orderId.startsWith('legacy-');
                            return (
                              <View key={order.orderId} style={styles.orderCard}>
                                <View style={styles.orderHeader}>
                                  <Text numeric style={styles.orderCode}>
                                    {legacy ? 'TỔNG HỢP NHÀ HÀNG' : shortCode('ĐH', order.orderId)}
                                  </Text>
                                  <Text numeric style={styles.orderIndex}>Đơn {orderIndex + 1}/{orders.length}</Text>
                                </View>
                                {legacy ? <Text style={styles.legacyHint}>BE hiện chưa trả orderId; đang hiển thị tổng hợp.</Text> : null}
                                {order.lines.map((line, index) => {
                                  const id = lineId(route.id, stop.restaurantId, order.orderId, index);
                                  const checked = checkedItems.has(id);
                                  return (
                                    <Pressable key={id} style={styles.itemRow} onPress={() => toggleItem(id)}>
                                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                        {checked ? <Ionicons name="checkmark" size={15} color={Colors.onPrimary} /> : null}
                                      </View>
                                      <View style={styles.itemCopy}>
                                        <Text style={[styles.itemName, checked && styles.itemNameChecked]}>{line.productName}</Text>
                                        <Text numeric style={styles.itemQuantity}>
                                          {line.quantity} đơn vị{line.capacityKg !== null ? ` · ${line.capacityKg} kg/đv` : ''}
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
            ))}

            <Pressable style={styles.dispatchButton} onPress={() => navigation.navigate('MarketDispatch')}>
              <Ionicons name="car-outline" size={19} color={Colors.onPrimary} />
              <Text style={styles.dispatchButtonText}>Mở kế hoạch phân xe</Text>
              <Ionicons name="arrow-forward" size={17} color={Colors.onPrimary} />
            </Pressable>
            <Text style={styles.disabledHint}>Tiến độ đánh dấu hiện chỉ lưu trong phiên làm việc cho tới khi BE có API lưu phân loại.</Text>
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
  dispatchButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  disabledHint: { textAlign: 'center', fontSize: 9, lineHeight: 14, color: Colors.textMuted, marginTop: -3 },
});
