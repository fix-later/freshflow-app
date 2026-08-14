import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
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
          color={isDragging ? Colors.driverPrimary : Colors.textMuted}
          style={styles.dragHandle}
        />
      )}
    </View>
  );
}

export function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
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
  const [savingOrder, setSavingOrder] = useState(false);

  const reorderModeRef = useRef(false);
  const savingOrderRef = useRef(false);
  const orderIdsRef = useRef<string[]>([]);
  const draggingIdxRef = useRef(-1);
  const insertIdxRef = useRef(-1);
  const dragY = useRef(new Animated.Value(0)).current;

  const listRef = useRef<View>(null);
  const listPageYRef = useRef(0);
  const itemHeightRef = useRef(ITEM_HEIGHT);

  useEffect(() => { reorderModeRef.current = reorderMode; }, [reorderMode]);
  useEffect(() => { savingOrderRef.current = savingOrder; }, [savingOrder]);
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

  const loadRoute = useCallback(async (targetDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const dateToFetch = targetDate ?? selectedDate;
      await driverRouteStore.load(dateToFetch);
      syncFromStore();
    } catch {
      setError('Không thể tải tuyến đường. Vui lòng kiểm tra lại ngày.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, syncFromStore]);

  useFocusEffect(
    useCallback(() => {
      if (driverRouteStore.getRoute() === null) {
        loadRoute();
      } else {
        syncFromStore();
        setLoading(false);
      }
    }, [loadRoute, syncFromStore]),
  );

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => new Date());

  const parseDateString = (str: string): Date => {
    const [y, m, d] = str.split('-').map(Number);
    if (y && m && d) {
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    return new Date();
  };

  const formatDateToString = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDatePicked = (selected?: Date) => {
    if (!selected) return;
    const formatted = formatDateToString(selected);
    setSelectedDate(formatted);
    loadRoute(formatted);
  };

  const openDatePicker = () => {
    const currentDate = parseDateString(selectedDate);
    setTempDate(currentDate);
    setShowDatePickerModal(true);
  };

  const renderDateSelector = () => (
    <View style={styles.dateSelectorCard}>
      <Pressable style={styles.datePickerBtn} onPress={openDatePicker}>
        <Ionicons name="calendar-outline" size={18} color={Colors.driverPrimary} />
        <Text style={styles.dateSelectorLabel}>Ngày:</Text>
        <Text style={styles.datePickerBtnText}>{selectedDate}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </Pressable>
      <TouchableOpacity
        style={styles.searchDateBtn}
        onPress={() => loadRoute(selectedDate)}
      >
        <Ionicons name="search" size={15} color={Colors.driverOnPrimary} />
        <Text style={styles.searchDateBtnText}>Xem tuyến</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePickerModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDatePickerModal(false)}
    >
      <View style={styles.dateModalBackdrop}>
        <TouchableWithoutFeedback onPress={() => setShowDatePickerModal(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.dateModalCard}>
          <View style={styles.dateModalHeader}>
            <Text style={styles.dateModalTitle}>Chọn ngày giao hàng</Text>
            <TouchableOpacity onPress={() => setShowDatePickerModal(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_event: DateTimePickerEvent, selected?: Date) => {
              if (selected) {
                setTempDate(selected);
              }
            }}
          />

          <View style={styles.dateModalFooter}>
            <TouchableOpacity
              style={styles.dateModalCancelBtn}
              onPress={() => setShowDatePickerModal(false)}
            >
              <Text style={styles.dateModalCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateModalConfirmBtn}
              onPress={() => {
                setShowDatePickerModal(false);
                handleDatePicked(tempDate);
              }}
            >
              <Text style={styles.dateModalConfirmText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const listPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => reorderModeRef.current && !savingOrderRef.current,
      onMoveShouldSetPanResponder: () => reorderModeRef.current && !savingOrderRef.current,

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

  /**
   * Persists the new stop order before leaving reorder mode. The server call must be
   * awaited (not fire-and-forget) — if it fails, the driver must not see "Xong" succeed
   * while the backend (and anything reading `Delivery.SequenceNumber`, e.g. Hub) still
   * has the old order, since `driverRouteStore` falls back to the local preview order
   * for display and would silently mask the desync otherwise.
   */
  const handleReorderDone = async () => {
    const route = driverRouteStore.getRoute();
    const needsServerSave = !!route && !hasPickupStarted && route.status === 'assigned';

    if (!needsServerSave) {
      commitOrder(orderIds);
      setMapOrderIds([...orderIds]);
      setReorderMode(false);
      return;
    }

    setSavingOrder(true);
    try {
      const hubStop = driverRouteStore.getHubStop();
      const fullStopOrder = hubStop ? [hubStop.entityId, ...orderIds] : orderIds;
      await driverApi.reorderRoute(route!.routeId, fullStopOrder);
      commitOrder(orderIds);
      setMapOrderIds([...orderIds]);
      setReorderMode(false);
    } catch {
      Alert.alert(
        'Lưu thứ tự thất bại',
        'Không thể lưu thứ tự điểm giao mới lên hệ thống. Vui lòng kiểm tra kết nối mạng và bấm "Xong" để thử lại.',
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const handleShowMap = () => {
    setShowRouteMap(true);
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

  const buildMapStops = (ids: string[]): RouteStop[] => {
    const list: RouteStop[] = [];
    const hubStop = driverRouteStore.getHubStop();
    if (hubStop && hubStop.latitude && hubStop.longitude) {
      list.push({
        order: 0,
        lat: hubStop.latitude,
        lng: hubStop.longitude,
        status: 'delivered',
      });
    }
    ids.forEach((id, idx) => {
      const item = itemById.get(id);
      if (item) {
        list.push({
          order: idx + 1,
          lat: item.lat,
          lng: item.lng,
          status: item.status,
        });
      }
    });
    return list;
  };

  const mapStops = buildMapStops(mapOrderIds);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.driverPrimary} />
          <Text style={styles.helperText}>Đang tải tuyến đường hôm nay...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.greetCard}>
            <View style={{ gap: 2 }}>
              <Text style={styles.greetTitle}>Xin chào, Tài xế!</Text>
              <Text style={styles.greetSub}>Chúc bạn một ca làm việc thuận lợi.</Text>
            </View>
          </View>
          {renderDateSelector()}
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIconWrap, { backgroundColor: Colors.errorContainer }]}>
              <Ionicons name="cloud-offline-outline" size={32} color={Colors.error} />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadRoute()}>
              <Ionicons name="refresh" size={18} color={Colors.driverOnPrimary} />
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        </ScrollView>
        {renderDatePickerModal()}
      </SafeAreaView>
    );
  }

  if (!routeStatus) {
    const isToday = selectedDate === new Date().toISOString().slice(0, 10);
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.greetCard}>
            <View style={{ gap: 2 }}>
              <Text style={styles.greetTitle}>Xin chào, Tài xế!</Text>
              <Text style={styles.greetSub}>Chúc bạn một ca làm việc thuận lợi.</Text>
            </View>
          </View>
          {renderDateSelector()}
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={Colors.driverPrimary} />
            </View>
            <Text style={styles.emptyTitle}>
              {isToday ? 'Hôm nay không có tuyến giao hàng' : 'Không có tuyến giao hàng'}
            </Text>
            <Text style={styles.helperText}>
              {isToday
                ? 'Bạn chưa được phân công tuyến giao hàng nào cho ngày hôm nay.'
                : `Bạn chưa được phân công tuyến giao hàng nào cho ngày ${selectedDate}.`}
            </Text>
          </View>
        </ScrollView>
        {renderDatePickerModal()}
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

        {/* ── Date Selector ── */}
        {renderDateSelector()}

        {/* ── Route summary ── */}
        <Text style={styles.sectionLabel}>Tuyến đường hôm nay</Text>
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <View style={styles.statusBadge}>
              <Ionicons name="bicycle-outline" size={13} color={Colors.driverPrimary} />
              <Text style={styles.statusLabel}>{ROUTE_STATUS_LABEL[routeStatus]}</Text>
            </View>
            <Text style={styles.routeDate}>{serviceDate}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={22} color={Colors.driverPrimary} />
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
              <TouchableOpacity
                style={[styles.reorderDoneBtn, savingOrder && { opacity: 0.7 }]}
                onPress={savingOrder ? undefined : handleReorderDone}
                disabled={savingOrder}
              >
                {savingOrder ? (
                  <ActivityIndicator size="small" color={Colors.driverOnPrimary} />
                ) : (
                  <Ionicons name="checkmark" size={13} color={Colors.driverOnPrimary} />
                )}
                <Text style={styles.reorderDoneBtnText}>{savingOrder ? 'Đang lưu...' : 'Xong'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.reorderToggleBtn} onPress={() => setReorderMode(true)}>
                <Ionicons name="swap-vertical-outline" size={13} color={Colors.driverPrimary} />
                <Text style={styles.reorderToggleBtnText}>Sắp xếp</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {reorderMode && (
          <View style={styles.reorderBanner}>
            <Ionicons name="hand-left-outline" size={15} color={Colors.driverPrimary} />
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
            color={Colors.driverOnPrimary}
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

      {/* ── Date Picker Modal ── */}
      {renderDatePickerModal()}
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
    backgroundColor: Colors.driverPrimary,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.driverOnPrimary },

  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginTop: 4,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.driverPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  greetCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.driverPrimary, borderRadius: 16, padding: 18,
  },
  greetTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  greetSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },

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
    backgroundColor: Colors.driverPrimaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusLabel: { fontSize: 12, fontWeight: '700', color: Colors.driverPrimary },
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
    borderRadius: 8, borderWidth: 1, borderColor: Colors.driverPrimary,
  },
  reorderToggleBtnText: { fontSize: 11, fontWeight: '700', color: Colors.driverPrimary },
  reorderDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.driverPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  reorderDoneBtnText: { fontSize: 12, fontWeight: '700', color: Colors.driverOnPrimary },

  reorderBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: Colors.driverPrimaryLight, borderRadius: 10, padding: 10,
  },
  reorderBannerText: { flex: 1, fontSize: 12, color: Colors.driverPrimary, fontWeight: '600', lineHeight: 17 },

  stopList: { gap: 0 },

  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  stopCardReorder: { borderColor: Colors.driverPrimary + '25' },
  stopCardDragging: {
    backgroundColor: Colors.driverPrimaryLight,
    borderColor: Colors.driverPrimary,
    borderWidth: 1.5,
  },
  stopCardTarget: {
    borderColor: Colors.driverPrimary,
    borderWidth: 2,
    borderStyle: 'dashed',
  },

  stopNumBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.driverPrimaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumBadgeDragging: { backgroundColor: Colors.driverPrimary },
  stopNumText: { fontSize: 14, fontWeight: '800', color: Colors.driverPrimary },
  stopNumTextDragging: { color: Colors.driverOnPrimary },

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
    gap: 8, backgroundColor: Colors.driverPrimary, borderRadius: 14, paddingVertical: 15,
  },
  hubBtnText: { color: Colors.driverOnPrimary, fontWeight: '700', fontSize: 15 },

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

  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  dateSelectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  datePickerBtn: {
    flex: 1,
    height: 38,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  searchDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.driverPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchDateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.driverOnPrimary,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerSheet: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: Colors.driverPrimary },

  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  dateModalCard: {
    width: '96%',
    maxWidth: 380,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dateModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  dateModalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dateModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dateModalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.driverPrimary,
  },
  dateModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.driverOnPrimary,
  },
});
