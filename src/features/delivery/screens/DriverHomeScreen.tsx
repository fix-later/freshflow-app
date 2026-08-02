import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { RouteOverviewMap, type RouteStop } from '../../../components/RouteOverviewMap';
import { type DriverStackParamList } from '../../../navigation/types';
import { driverApi } from '../api/driverApi';
import { driverRouteStore } from '../store/driverRouteStore';
import { type DeliveryStatus, type RouteStatus } from '../types/delivery.types';

type Nav = NativeStackNavigationProp<DriverStackParamList>;

const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  planned: 'Đã lên kế hoạch',
  selected: 'Đã chọn',
  reviewed: 'Đã duyệt',
  assigned: 'Đã phân công',
  in_progress: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
};

const NOT_STARTED_STATUSES: RouteStatus[] = ['planned', 'selected', 'reviewed', 'assigned'];

// Estimated height of each card + 8px gap (used for drag index calculation)
const ITEM_HEIGHT = 62;

/**
 * A single row in the "Thứ tự điểm giao" drag list. Before the driver has ever
 * confirmed pickup, `route.deliveries` is still empty server-side (it's created
 * by confirm-pickup), so `id`/`subtitle` come from the read-only stop preview
 * instead of a real delivery — same card, same drag mechanics either way.
 */
interface HomeStopItem {
  id: string;
  title: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  status: DeliveryStatus;
}

function StopOrderCard({
  item,
  displayOrder,
  reorderMode,
  isDragging,
  isTarget,
}: {
  item: HomeStopItem;
  displayOrder: number;
  reorderMode: boolean;
  isDragging: boolean;
  isTarget: boolean;
}) {
  return (
    <View
      style={[
        styles.stopCard,
        reorderMode && styles.stopCardReorder,
        isDragging && styles.stopCardDragging,
        isTarget && styles.stopCardTarget,
      ]}
    >
      <View style={[styles.stopNumBadge, isDragging && styles.stopNumBadgeDragging]}>
        <Text style={[styles.stopNumText, isDragging && styles.stopNumTextDragging]}>
          {displayOrder}
        </Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={styles.stopName} numberOfLines={1}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.stopOrderId} numberOfLines={1}>{item.subtitle}</Text>
        )}
      </View>
      {reorderMode && (
        <Ionicons
          name="reorder-four-outline"
          size={22}
          color={isDragging ? Colors.primary : Colors.textMuted}
          style={styles.dragHandle}
        />
      )}
    </View>
  );
}

export function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus | null>(null);
  const [serviceDate, setServiceDate] = useState('');
  const [hasPickupStarted, setHasPickupStarted] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | undefined>();
  const [currentLng, setCurrentLng] = useState<number | undefined>();

  const [reorderMode, setReorderMode] = useState(false);
  const [itemById, setItemById] = useState<Map<string, HomeStopItem>>(new Map());
  const [orderIds, setOrderIds] = useState<string[]>([]);
  // Map only re-renders when reorder mode exits ("Xong")
  const [mapOrderIds, setMapOrderIds] = useState<string[]>([]);

  const [draggingIdx, setDraggingIdx] = useState(-1);
  const [insertIdx, setInsertIdx] = useState(-1);

  const reorderModeRef = useRef(false);
  const orderIdsRef = useRef<string[]>([]);
  const draggingIdxRef = useRef(-1);
  const insertIdxRef = useRef(-1);
  const dragY = useRef(new Animated.Value(0)).current;

  const listRef = useRef<View>(null);
  const listPageYRef = useRef(0);
  const itemHeightRef = useRef(ITEM_HEIGHT);

  useEffect(() => { reorderModeRef.current = reorderMode; }, [reorderMode]);
  useEffect(() => { orderIdsRef.current = orderIds; }, [orderIds]);

  useEffect(() => {
    if (reorderMode) {
      setTimeout(() => {
        listRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          listPageYRef.current = pageY;
        });
      }, 150);
    }
  }, [reorderMode]);

  // Reflects whatever driverRouteStore currently holds (including any client-side
  // reorder) into local render state, without hitting the network. Before pickup
  // is confirmed, `deliveries` is empty server-side, so the item list is built
  // from the stop preview instead — same shape either way.
  const syncFromStore = useCallback(() => {
    const route = driverRouteStore.getRoute();
    const started = driverRouteStore.hasPickupStarted();
    setHasPickupStarted(started);
    setRouteStatus(route?.status ?? null);
    setServiceDate(route?.serviceDate ?? '');

    const items: HomeStopItem[] = started
      ? driverRouteStore.getStops().map(s => ({
          id: s.deliveryId,
          title: s.restaurantName,
          subtitle: `Đơn #${s.orderId.slice(0, 8).toUpperCase()}`,
          lat: s.lat,
          lng: s.lng,
          status: s.status,
        }))
      : driverRouteStore.getPickupPreviewStops().map(s => ({
          id: s.entityId,
          title: s.restaurantName,
          subtitle: null,
          lat: s.lat,
          lng: s.lng,
          status: 'pending' as const,
        }));

    setItemById(new Map(items.map(i => [i.id, i])));
    const ids = items.map(i => i.id);
    setOrderIds(ids);
    setMapOrderIds(ids);
  }, []);

  const loadRoute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await driverRouteStore.load();
      syncFromStore();
    } catch {
      setError('Không thể tải tuyến đường hôm nay. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [syncFromStore]);

  useFocusEffect(
    useCallback(() => {
      // Only hit the network the first time — refetching on every focus would
      // overwrite the driver's in-progress custom stop order with the server default.
      if (driverRouteStore.getRoute() === null) {
        loadRoute();
      } else {
        syncFromStore();
        setLoading(false);
      }
    }, [loadRoute, syncFromStore]),
  );

  const listPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => reorderModeRef.current,
      onMoveShouldSetPanResponder: () => reorderModeRef.current,

      onPanResponderGrant: (e) => {
        const relY = e.nativeEvent.pageY - listPageYRef.current;
        const h = itemHeightRef.current;
        const total = orderIdsRef.current.length;
        const idx = Math.min(total - 1, Math.max(0, Math.floor(relY / h)));
        draggingIdxRef.current = idx;
        insertIdxRef.current = idx;
        dragY.setValue(0);
        setDraggingIdx(idx);
        setInsertIdx(idx);
      },

      onPanResponderMove: (_, { dy }) => {
        if (draggingIdxRef.current < 0) return;
        dragY.setValue(dy);
        const from = draggingIdxRef.current;
        const h = itemHeightRef.current;
        const total = orderIdsRef.current.length;
        const target = Math.min(total - 1, Math.max(0, Math.round(from + dy / h)));
        if (target !== insertIdxRef.current) {
          insertIdxRef.current = target;
          setInsertIdx(target);
        }
      },

      onPanResponderRelease: () => {
        const from = draggingIdxRef.current;
        const to = insertIdxRef.current;
        if (from >= 0 && from !== to) {
          setOrderIds(prev => {
            const next = [...prev];
            const [removed] = next.splice(from, 1);
            next.splice(to, 0, removed);
            return next;
          });
        }
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, speed: 40 }).start();
        draggingIdxRef.current = -1;
        insertIdxRef.current = -1;
        setDraggingIdx(-1);
        setInsertIdx(-1);
      },

      onPanResponderTerminate: () => {
        dragY.setValue(0);
        draggingIdxRef.current = -1;
        insertIdxRef.current = -1;
        setDraggingIdx(-1);
        setInsertIdx(-1);
      },
    }),
  ).current;

  const orderedItems = orderIds.map((id, idx) => ({
    item: itemById.get(id)!,
    displayOrder: idx + 1,
  })).filter(({ item }) => item);

  const commitOrder = (ids: string[]) => {
    if (hasPickupStarted) {
      driverRouteStore.setStopOrder(ids);
    } else {
      driverRouteStore.setPickupPreviewStopOrder(ids);
    }
  };

  const handleReorderDone = () => {
    commitOrder(orderIds);
    setMapOrderIds([...orderIds]);
    setReorderMode(false);
    const route = driverRouteStore.getRoute();
    if (route && !hasPickupStarted && route.status === 'assigned') {
      const hubStop = driverRouteStore.getHubStop();
      const fullStopOrder = hubStop ? [hubStop.entityId, ...orderIds] : orderIds;
      driverApi.reorderRoute(route.routeId, fullStopOrder).catch(() => {});
    }
  };

  const handleShowMap = async () => {
    setShowRouteMap(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLat(pos.coords.latitude);
        setCurrentLng(pos.coords.longitude);
      }
    } catch {
      // show map without driver location
    }
  };

  const handleMainAction = () => {
    const route = driverRouteStore.getRoute();
    if (!route) return;

    commitOrder(orderIds);

    if (hasPickupStarted) {
      // Pickup confirmed already! Go directly to StopList delivery execution screen
      navigation.navigate('StopList', { routeId: route.routeId });
    } else {
      // Pickup not confirmed yet — navigate to PickupConfirmScreen to check off items & confirm pickup.
      // `startRoute` will be executed on PickupConfirmScreen AFTER confirmPickup creates delivery rows.
      navigation.navigate('PickupConfirm', { routeId: route.routeId });
    }
  };

  const buildMapStops = (ids: string[]): RouteStop[] =>
    ids.map((id, idx) => {
      const item = itemById.get(id);
      return { order: idx + 1, lat: item?.lat ?? 0, lng: item?.lng ?? 0, status: item?.status ?? 'pending' };
    });

  const mapStops = buildMapStops(mapOrderIds);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.helperText}>Đang tải tuyến đường hôm nay...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadRoute}>
            <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!routeStatus) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có tuyến đường</Text>
          <Text style={styles.helperText}>Bạn chưa được phân công tuyến giao hàng nào cho hôm nay.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!reorderMode}
      >
        {/* ── Greeting ── */}
        <View style={styles.greetCard}>
          <View style={{ gap: 2 }}>
            <Text style={styles.greetTitle}>Xin chào, Tài xế!</Text>
            <Text style={styles.greetSub}>Chúc bạn một ca làm việc thuận lợi.</Text>
          </View>
        </View>

        {/* ── Route summary ── */}
        <Text style={styles.sectionLabel}>Tuyến đường hôm nay</Text>
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <View style={styles.statusBadge}>
              <Ionicons name="bicycle-outline" size={13} color={Colors.primary} />
              <Text style={styles.statusLabel}>{ROUTE_STATUS_LABEL[routeStatus]}</Text>
            </View>
            <Text style={styles.routeDate}>{serviceDate}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={22} color={Colors.primary} />
              <Text style={styles.statVal}>{orderedItems.length}</Text>
              <Text style={styles.statLbl}>Điểm giao</Text>
            </View>
          </View>

          {/* Map thumbnail */}
          <Pressable onPress={handleShowMap} style={styles.mapThumbWrap}>
            <RouteOverviewMap
              stops={mapStops}
              currentLat={currentLat}
              currentLng={currentLng}
              style={styles.mapThumb}
            />
            <View style={styles.mapThumbOverlay} pointerEvents="none">
              <View style={styles.mapThumbBadge}>
                <Ionicons name="expand-outline" size={13} color="#fff" />
                <Text style={styles.mapThumbBadgeText}>Xem toàn màn hình</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ── Stop order section ── */}
        <View style={styles.stopSectionHeader}>
          <View style={{ flex: 1, gap: 2, marginRight: 8 }}>
            <Text style={styles.sectionLabel}>
              Thứ tự điểm giao{!hasPickupStarted ? ' dự kiến' : ''}
            </Text>
            <Text style={styles.stopSectionSub} numberOfLines={1}>
              {!hasPickupStarted
                ? 'Sắp xếp lại tuyến đường trước khi lấy hàng'
                : 'Thứ tự giao hàng đến các nhà hàng'}
            </Text>
          </View>
          {!hasPickupStarted && (
            reorderMode ? (
              <TouchableOpacity style={styles.reorderDoneBtn} onPress={handleReorderDone}>
                <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />
                <Text style={styles.reorderDoneBtnText}>Xong</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.reorderToggleBtn} onPress={() => setReorderMode(true)}>
                <Ionicons name="swap-vertical-outline" size={13} color={Colors.primary} />
                <Text style={styles.reorderToggleBtnText}>Sắp xếp</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {reorderMode && (
          <View style={styles.reorderBanner}>
            <Ionicons name="hand-left-outline" size={15} color={Colors.primary} />
            <Text style={styles.reorderBannerText}>
              Giữ và kéo biểu tượng ≡ để đổi thứ tự ghé từng nhà hàng. Thứ tự này sẽ dùng để
              chất hàng lên xe — điểm giao cuối chất trước, điểm giao đầu chất sau cùng để dễ
              lấy ra khi giao.
            </Text>
          </View>
        )}

        {/* Drag-to-reorder list */}
        <View
          ref={listRef}
          collapsable={false}
          {...listPanResponder.panHandlers}
          style={styles.stopList}
          onLayout={() => {
            listRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
              listPageYRef.current = pageY;
            });
          }}
        >
          {orderedItems.map(({ item, displayOrder }, idx) => {
            const isDragging = idx === draggingIdx;
            const isTarget = draggingIdx >= 0 && !isDragging && idx === insertIdx;
            return (
              <Animated.View
                key={item.id}
                onLayout={idx === 0 ? (e) => {
                  itemHeightRef.current = e.nativeEvent.layout.height + 8;
                } : undefined}
                style={[
                  isDragging && {
                    transform: [{ translateY: dragY }],
                    zIndex: 10,
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 5 },
                    elevation: 8,
                    borderRadius: 14,
                  },
                  { marginBottom: idx < orderedItems.length - 1 ? 8 : 0 },
                ]}
              >
                <StopOrderCard
                  item={item}
                  displayOrder={displayOrder}
                  reorderMode={reorderMode}
                  isTarget={isTarget}
                  isDragging={isDragging}
                />
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.hubBtn, pressed && { opacity: 0.85 }]}
          onPress={handleMainAction}
        >
          <Ionicons
            name={hasPickupStarted ? 'bicycle-outline' : 'cube-outline'}
            size={18}
            color={Colors.onPrimary}
          />
          <Text style={styles.hubBtnText}>
            {hasPickupStarted
              ? 'Vào danh sách giao hàng'
              : 'Nhận hàng tại Hub'}
          </Text>
        </Pressable>
      </View>

      {/* ── Route Map Modal ── */}
      <Modal
        visible={showRouteMap}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRouteMap(false)}
      >
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Bản đồ tuyến đường</Text>
              <Text style={styles.modalSub}>{serviceDate} · {orderedItems.length} điểm giao</Text>
            </View>
            <Pressable onPress={() => setShowRouteMap(false)} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <RouteOverviewMap
            stops={mapStops}
            currentLat={currentLat}
            currentLng={currentLng}
            style={styles.fullMap}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  helperText: { maxWidth: 300, fontSize: 13, lineHeight: 19, textAlign: 'center', color: Colors.textMuted },
  errorText: { maxWidth: 300, fontSize: 14, lineHeight: 20, textAlign: 'center', color: Colors.error },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 4, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11,
    backgroundColor: Colors.primary,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.onPrimary },

  greetCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, borderRadius: 16, padding: 18,
  },
  greetTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  greetSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  routeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 16, gap: 14,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  routeCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  routeDate: { fontSize: 12, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statLbl: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  mapThumbWrap: {
    borderRadius: 12, overflow: 'hidden', height: 150,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  mapThumb: { flex: 1, borderRadius: 0 },
  mapThumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingBottom: 8, alignItems: 'flex-end',
  },
  mapThumbBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  mapThumbBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  stopSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4,
  },
  stopSectionSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  reorderToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.primary,
  },
  reorderToggleBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  reorderDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  reorderDoneBtnText: { fontSize: 12, fontWeight: '700', color: Colors.onPrimary },

  reorderBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 10,
  },
  reorderBannerText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '600', lineHeight: 17 },

  stopList: { gap: 0 },

  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  stopCardReorder: { borderColor: Colors.primary + '25' },
  stopCardDragging: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  stopCardTarget: {
    borderColor: Colors.primary,
    borderWidth: 2,
    borderStyle: 'dashed',
  },

  stopNumBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumBadgeDragging: { backgroundColor: Colors.primary },
  stopNumText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  stopNumTextDragging: { color: Colors.onPrimary },

  stopInfo: { flex: 1, gap: 2 },
  stopName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  stopOrderId: { fontSize: 11, color: Colors.textMuted },

  dragHandle: { flexShrink: 0, paddingHorizontal: 2 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    padding: 16,
  },
  hubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
  },
  hubBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  modalScreen: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  fullMap: { flex: 1 },
});
