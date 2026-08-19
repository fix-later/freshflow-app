import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { GoongMap } from '../../../components/GoongMap';
import { type DriverStackParamList } from '../../../navigation/types';
import { orderApi, type OrderItemDto } from '../../orders/api/orderApi';
import { driverApi } from '../api/driverApi';
import { driverRouteStore, type DeliveryStop } from '../store/driverRouteStore';
import { type DeliveryStatus } from '../types/delivery.types';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import {
  formatQuantityTotal,
  formatQuantityWithUnit,
} from '../../../utils/quantity';

type Props = NativeStackScreenProps<DriverStackParamList, 'DriverNavigation'>;

const COLLAPSED_H = 250;
const EXPANDED_H = 510;

export function NavigationScreen({ route, navigation }: Props) {
  const stop: DeliveryStop | undefined = driverRouteStore.getStop(route.params.deliveryId);
  const insets = useSafeAreaInsets();

  const [localStatus, setLocalStatus] = useState<DeliveryStatus>(stop?.status ?? 'pending');
  const [updatingArrival, setUpdatingArrival] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | undefined>(undefined);
  const [currentLng, setCurrentLng] = useState<number | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<OrderItemDto[] | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [itemsUnavailable, setItemsUnavailable] = useState(false);

  // ── Bottom sheet drag ──────────────────────────────────────────────────────
  const sheetHeightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;
  const sheetCurrentH = useRef(COLLAPSED_H);
  const gestureStartHeight = useRef(COLLAPSED_H);

  useEffect(() => {
    const listenerId = sheetHeightAnim.addListener(({ value }) => {
      sheetCurrentH.current = value;
      setExpanded(value > COLLAPSED_H + 30);
    });
    return () => {
      sheetHeightAnim.removeListener(listenerId);
    };
  }, [sheetHeightAnim]);

  const snapTo = useCallback((h: number) => {
    Animated.spring(sheetHeightAnim, {
      toValue: h,
      useNativeDriver: false,
      tension: 100,
      friction: 14,
    }).start(() => {
      sheetCurrentH.current = h;
      setExpanded(h === EXPANDED_H);
    });
  }, [sheetHeightAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderGrant: () => {
        sheetHeightAnim.stopAnimation();
        gestureStartHeight.current = sheetCurrentH.current;
      },
      onPanResponderMove: (_, { dy }) => {
        const next = Math.max(COLLAPSED_H, Math.min(EXPANDED_H, gestureStartHeight.current - dy));
        sheetHeightAnim.setValue(next);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const projected = gestureStartHeight.current - dy;

        let finalH = COLLAPSED_H;
        if (vy < -0.3) {
          finalH = EXPANDED_H;
        } else if (vy > 0.3) {
          finalH = COLLAPSED_H;
        } else if (projected > (COLLAPSED_H + EXPANDED_H) / 2) {
          finalH = EXPANDED_H;
        }

        snapTo(finalH);
      },
    }),
  ).current;

  // ── Focus sync ─────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (stop) setLocalStatus(driverRouteStore.getStop(stop.deliveryId)?.status ?? stop.status);
    }, [stop]),
  );

  // ── Goods list for stop — uses driver-authorized loading manifest API ──
  useEffect(() => {
    if (!stop) return;
    let cancelled = false;

    const loadItems = async () => {
      // 1. Check cached lines in driverRouteStore
      const cachedLines = driverRouteStore.getManifestLinesForOrder(stop.orderId);
      if (cachedLines.length > 0) {
        setItems(
          cachedLines.map(l => ({
            orderItemId: l.orderItemId,
            marketProductId: '',
            productNameSnapshot: l.productName,
            unit: l.unit,
            unitPriceSnapshot: 0,
            quantity: l.quantity,
            lineSubtotal: 0,
          } as any)),
        );
        return;
      }

      // 2. Try loading manifest from API
      try {
        const route = driverRouteStore.getRoute();
        if (route) {
          const manifest = await driverApi.getLoadingManifest(
            route.routeId,
            route.stops.filter((routeStop) => routeStop.entityType === 'market')
              .map((routeStop) => routeStop.entityId),
          );
          if (cancelled) return;
          if (manifest && manifest.stops && manifest.stops.length > 0) {
            driverRouteStore.setManifestStops(manifest.stops);
            const stopLines = driverRouteStore.getManifestLinesForOrder(stop.orderId);
            if (stopLines.length > 0) {
              setItems(
                stopLines.map(l => ({
                  orderItemId: l.orderItemId,
                  marketProductId: '',
                  productNameSnapshot: l.productName,
                  unit: l.unit,
                  unitPriceSnapshot: 0,
                  quantity: l.quantity,
                  lineSubtotal: 0,
                } as any)),
              );
              return;
            }
          }
        }
      } catch {
        // loading manifest failed, try order detail
      }

      // 3. Fallback to order detail
      try {
        const order = await orderApi.getById(stop.orderId);
        if (cancelled) return;
        setItems(order.items);
        setNotes(order.notes);
      } catch {
        if (!cancelled) setItemsUnavailable(true);
      }
    };

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [stop]);

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLat(pos.coords.latitude);
      setCurrentLng(pos.coords.longitude);
    })();
  }, []);

  const handleOpenMaps = () => {
    if (!stop) return;
    Linking.openURL(`https://maps.google.com/?q=${stop.lat},${stop.lng}`)
      .catch(() => Alert.alert('Lỗi', 'Không thể mở bản đồ'));
  };

  const handleArrived = async () => {
    if (!stop) return;
    setUpdatingArrival(true);
    try {
      await driverApi.updateDeliveryStatus(stop.deliveryId, 'ARRIVED');
      driverRouteStore.setDeliveryStatus(stop.deliveryId, 'arrived');
      setLocalStatus('arrived');
    } catch (arrivalError) {
      Alert.alert('Lỗi', getApiErrorMessage(arrivalError, 'Không thể cập nhật trạng thái. Vui lòng thử lại.'));
    } finally {
      setUpdatingArrival(false);
    }
  };

  const handleDelivered = () => {
    if (!stop) return;
    navigation.navigate('ProofOfDelivery', { deliveryId: stop.deliveryId });
  };

  const handleFailed = () => {
    if (!stop) return;
    navigation.navigate('ReportDeliveryIssue', { deliveryId: stop.deliveryId });
  };

  if (!stop) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={{ color: Colors.error, fontSize: 14 }}>Không tìm thấy điểm giao hàng</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const isDone = localStatus === 'delivered' || localStatus === 'failed';
  const totalQuantityLabel = formatQuantityTotal(items ?? []);
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={styles.screen}>
      {/* ── Full-screen map ── */}
      <GoongMap
        destLat={stop.lat}
        destLng={stop.lng}
        currentLat={currentLat}
        currentLng={currentLng}
        style={styles.fullMap}
      />

      {/* ── Floating header row ── */}
      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <Pressable style={styles.floatBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.stopPill}>
          <Text style={styles.stopPillText} numberOfLines={1}>#{stop.order} · {stop.restaurantName}</Text>
        </View>
        <Pressable style={[styles.floatBtn, styles.mapsBtn]} onPress={handleOpenMaps} hitSlop={8}>
          <Ionicons name="navigate" size={13} color={Colors.onPrimary} />
          <Text style={styles.mapsBtnText}>Maps</Text>
        </Pressable>
      </View>

      {/* ── Bottom sheet ── */}
      <Animated.View style={[styles.sheet, { height: sheetHeightAnim }]}>

        <View {...panResponder.panHandlers} style={styles.sheetHeaderContainer}>
          <Pressable
            onPress={() => snapTo(expanded ? COLLAPSED_H : EXPANDED_H)}
            style={styles.dragHandleArea}
          >
            <View style={styles.dragHandle} />
          </Pressable>

          <View style={styles.stopHeaderRow}>
            <Pressable
              onPress={() => snapTo(expanded ? COLLAPSED_H : EXPANDED_H)}
              style={styles.stopHeaderLeft}
            >
              <View style={[
                styles.stopNumBadge,
                localStatus === 'delivered' && { backgroundColor: Colors.success },
                localStatus === 'failed' && { backgroundColor: Colors.danger },
              ]}>
                <Text style={styles.stopNumText}>#{stop.order}</Text>
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.restaurantName} numberOfLines={1}>{stop.restaurantName}</Text>
                <Text style={styles.orderIdText} numberOfLines={1}>
                  Đơn #{stop.orderId.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={{ paddingTop: 6 }}
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {expanded ? (
            <View style={styles.expandedSection}>
              <Text style={styles.goodsLabel}>HÀNG HOÁ CẦN GIAO</Text>

              {items?.map(item => (
                <View key={item.orderItemId} style={styles.itemRow}>
                  <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                  <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                  <Text style={styles.itemQty}>
                    {formatQuantityWithUnit(item.quantity, item.unit)}
                  </Text>
                </View>
              ))}
              {itemsUnavailable && (
                <Text style={styles.itemsUnavailableText}>Không thể tải chi tiết đơn hàng.</Text>
              )}

              {notes && (
                <View style={styles.notesRow}>
                  <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.notesText}>{notes}</Text>
                </View>
              )}

              {localStatus === 'arrived' && (
                <View style={styles.arrivedMsg}>
                  <Ionicons name="information-circle" size={16} color={Colors.primary} />
                  <Text style={styles.arrivedMsgText}>Bạn đã tới điểm giao. Chọn kết quả:</Text>
                </View>
              )}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.itemsStrip}
              contentContainerStyle={styles.itemsStripContent}
            >
              <View style={styles.itemsCountChip}>
                <Ionicons name="cube-outline" size={12} color={Colors.primary} />
                <Text style={styles.itemsCountText}>
                  {items?.length ?? 0} loại · {totalQuantityLabel}
                </Text>
              </View>
              {items?.map(item => (
                <View key={item.orderItemId} style={styles.itemChip}>
                  <Text style={styles.itemChipText}>
                    {item.productNameSnapshot}{' '}
                    <Text style={{ fontWeight: '800', color: Colors.primary }}>
                      {formatQuantityWithUnit(item.quantity, item.unit)}
                    </Text>
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        {/* ── Action area — always pinned to bottom ── */}
        <View style={[styles.actionsSection, { paddingBottom: bottomPad }]}>
          <View style={styles.sheetDivider} />
          <View style={styles.actionsBar}>

            {localStatus === 'pending' && (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, updatingArrival && { opacity: 0.6 }]}
                onPress={updatingArrival ? undefined : handleArrived}
                disabled={updatingArrival}
              >
                <Ionicons name="location" size={18} color={Colors.onPrimary} />
                <Text style={styles.primaryBtnText}>{updatingArrival ? 'Đang cập nhật...' : 'Đã tới nơi'}</Text>
              </Pressable>
            )}

            {localStatus === 'arrived' && !expanded && (
              <View style={styles.arrivedRow}>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
                  onPress={handleDelivered}
                >
                  <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
                  <Text style={styles.primaryBtnText}>Xác nhận đã giao</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.failIconBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleFailed}
                >
                  <Ionicons name="close-circle-outline" size={24} color={Colors.danger} />
                </Pressable>
              </View>
            )}

            {localStatus === 'arrived' && expanded && (
              <View style={styles.expandedActions}>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleDelivered}
                >
                  <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
                  <Text style={styles.primaryBtnText}>Xác nhận đã giao</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.failBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleFailed}
                >
                  <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                  <Text style={styles.failBtnText}>Không giao được</Text>
                </Pressable>
              </View>
            )}

            {isDone && (
              <View style={styles.doneBar}>
                <View style={styles.doneState}>
                  {localStatus === 'delivered'
                    ? <><Ionicons name="checkmark-circle" size={18} color={Colors.success} /><Text style={[styles.doneText, { color: Colors.success }]}>Đã giao thành công</Text></>
                    : <><Ionicons name="close-circle" size={18} color={Colors.danger} /><Text style={[styles.doneText, { color: Colors.danger }]}>Không giao được</Text></>
                  }
                </View>
                <Pressable
                  style={({ pressed }) => [styles.backListBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.backListBtnText}>Về danh sách</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const SHEET_BG = '#FFFFFF';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1C1C1E' },
  fullMap: { flex: 1, borderRadius: 0 },

  floatingHeader: {
    position: 'absolute', left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  floatBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: SHEET_BG,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stopPill: {
    flex: 1, height: 38, borderRadius: 19,
    backgroundColor: SHEET_BG, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stopPillText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  mapsBtn: {
    flexDirection: 'row', width: 'auto',
    paddingHorizontal: 12, gap: 5,
    backgroundColor: Colors.driverPrimary,
  },
  mapsBtnText: { fontSize: 12, fontWeight: '700', color: Colors.driverOnPrimary },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: -3 },
    elevation: 16,
    overflow: 'hidden',
  },

  dragHandleArea: {
    alignItems: 'center', paddingTop: 8, paddingBottom: 8,
    width: '100%',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
  },

  sheetScroll: { flex: 1 },

  sheetHeaderContainer: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  stopHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },

  stopNumBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.driverPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumText: { fontSize: 14, fontWeight: '900', color: Colors.driverOnPrimary },
  restaurantName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  orderIdText: { fontSize: 11, color: Colors.textMuted },

  itemsStrip: { maxHeight: 36 },
  itemsStripContent: { paddingHorizontal: 16, gap: 6, flexDirection: 'row', alignItems: 'center' },
  itemsCountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.driverPrimaryLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  itemsCountText: { fontSize: 11, fontWeight: '700', color: Colors.driverPrimary },
  itemChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  itemChipText: { fontSize: 11, color: Colors.textSecondary },

  expandedSection: {
    paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  goodsLabel: {
    fontSize: 11, fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    paddingVertical: 10,
  },
  itemName: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  itemQty: { fontSize: 14, fontWeight: '800', color: Colors.driverPrimary },
  itemsUnavailableText: { fontSize: 12, color: Colors.textMuted, paddingVertical: 8 },
  notesRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.warningLight,
    borderRadius: 8, padding: 8,
  },
  notesText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  arrivedMsg: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.driverPrimaryLight,
    borderRadius: 10, padding: 10, marginTop: 4,
  },
  arrivedMsgText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.driverPrimary },

  actionsSection: { flexShrink: 0 },
  sheetDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: 16 },
  actionsBar: { padding: 16, gap: 10 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.driverPrimary,
    borderRadius: 14, paddingVertical: 14,
  },
  primaryBtnText: { color: Colors.driverOnPrimary, fontWeight: '700', fontSize: 15 },

  arrivedRow: { flexDirection: 'row', gap: 8 },
  failIconBtn: {
    width: 52, borderRadius: 14,
    backgroundColor: Colors.danger + '15',
    borderWidth: 1.5, borderColor: Colors.danger + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  expandedActions: { gap: 10 },
  failBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.danger,
    backgroundColor: Colors.danger + '08',
  },
  failBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },

  doneBar: { gap: 8 },
  doneState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  doneText: { fontSize: 14, fontWeight: '700' },
  backListBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14, paddingVertical: 12,
  },
  backListBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  backBtn: {
    backgroundColor: Colors.driverPrimary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  backBtnText: { color: Colors.driverOnPrimary, fontWeight: '700', fontSize: 14 },
});
