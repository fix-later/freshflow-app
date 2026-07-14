import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { RouteOverviewMap, type RouteStop } from '../../../components/RouteOverviewMap';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_ROUTE, MOCK_STOPS } from '../mockData';
import { stopOrderStore } from '../stopOrderStore';

type Nav = NativeStackNavigationProp<DriverStackParamList>;

function StopOrderCard({
  stop,
  reorderMode,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  stop: (typeof MOCK_STOPS)[0] & { displayOrder: number };
  reorderMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <View style={[styles.stopCard, reorderMode && styles.stopCardReorder]}>
      <View style={styles.stopNumBadge}>
        <Text style={styles.stopNumText}>{stop.displayOrder}</Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={styles.stopName} numberOfLines={1}>{stop.restaurantName}</Text>
        <View style={styles.stopAddressRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.stopAddress} numberOfLines={1}>{stop.address}</Text>
        </View>
      </View>
      {reorderMode && (
        <View style={styles.reorderBtns}>
          <TouchableOpacity
            style={[styles.reorderArrow, !canMoveUp && styles.reorderArrowDisabled]}
            onPress={canMoveUp ? onMoveUp : undefined}
            activeOpacity={canMoveUp ? 0.6 : 1}
          >
            <Ionicons name="chevron-up" size={18} color={canMoveUp ? Colors.primary : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reorderArrow, !canMoveDown && styles.reorderArrowDisabled]}
            onPress={canMoveDown ? onMoveDown : undefined}
            activeOpacity={canMoveDown ? 0.6 : 1}
          >
            <Ionicons name="chevron-down" size={18} color={canMoveDown ? Colors.primary : Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function buildMapStops(ids: string[]): RouteStop[] {
  return ids.map((id, idx) => {
    const s = MOCK_STOPS.find(ms => ms.id === id)!;
    return { order: idx + 1, lat: s.lat, lng: s.lng, status: 'pending' as const };
  });
}

export function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const route = MOCK_ROUTE;

  const [showRouteMap, setShowRouteMap] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | undefined>();
  const [currentLng, setCurrentLng] = useState<number | undefined>();
  const [reorderMode, setReorderMode] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>(() => MOCK_STOPS.map(s => s.id));
  // Map only re-renders when reorder mode exits (avoids flicker on each arrow tap)
  const [mapOrderIds, setMapOrderIds] = useState<string[]>(() => MOCK_STOPS.map(s => s.id));

  const orderedStops = orderIds.map((id, idx) => ({
    ...MOCK_STOPS.find(ms => ms.id === id)!,
    displayOrder: idx + 1,
  }));

  const moveStop = (id: string, dir: 'up' | 'down') => {
    setOrderIds(prev => {
      const idx = prev.indexOf(id);
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const handleReorderDone = () => {
    setMapOrderIds([...orderIds]);
    setReorderMode(false);
  };

  const handleShowMap = async () => {
    setShowRouteMap(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLat(pos.coords.latitude);
        setCurrentLng(pos.coords.longitude);
      }
    } catch {
      // show map without driver location
    }
  };

  const handleGoToHub = () => {
    stopOrderStore.set(orderIds);
    navigation.navigate('PickupConfirm', { routeId: route.id });
  };

  const mapStops = buildMapStops(mapOrderIds);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <View style={styles.greetCard}>
          <View style={{ gap: 2 }}>
            <Text style={styles.greetTitle}>Xin chào, Tài xế!</Text>
            <Text style={styles.greetSub}>Chúc bạn một ca làm việc thuận lợi.</Text>
          </View>
          <View style={styles.vehiclePill}>
            <Ionicons name="car-outline" size={13} color={Colors.primary} />
            <Text style={styles.vehiclePlate}>{route.vehicle.plateNumber}</Text>
          </View>
        </View>

        {/* ── Route summary ── */}
        <Text style={styles.sectionLabel}>Tuyến đường hôm nay</Text>
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <View style={styles.statusBadge}>
              <Ionicons name="bicycle-outline" size={13} color={Colors.primary} />
              <Text style={styles.statusLabel}>Đang giao</Text>
            </View>
            <Text style={styles.routeDate}>{route.serviceDate}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={22} color={Colors.primary} />
              <Text style={styles.statVal}>{route.totalStops}</Text>
              <Text style={styles.statLbl}>Điểm dừng</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={22} color={Colors.secondary} />
              <Text style={styles.statVal}>{route.totalDistanceKm} km</Text>
              <Text style={styles.statLbl}>Quãng đường</Text>
            </View>
          </View>

          {/* Map thumbnail — tap to open fullscreen */}
          <Pressable onPress={handleShowMap} style={styles.mapThumbWrap}>
            <RouteOverviewMap
              stops={mapStops}
              currentLat={currentLat}
              currentLng={currentLng}
              style={styles.mapThumb}
            />
            {/* overlay so tap registers over WebView */}
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
          <View style={{ gap: 2 }}>
            <Text style={styles.sectionLabel}>Thứ tự điểm giao</Text>
            <Text style={styles.stopSectionSub}>Sắp xếp trước khi ra lấy hàng</Text>
          </View>
          {reorderMode ? (
            <TouchableOpacity style={styles.reorderDoneBtn} onPress={handleReorderDone}>
              <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />
              <Text style={styles.reorderDoneBtnText}>Xong</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.reorderToggleBtn} onPress={() => setReorderMode(true)}>
              <Ionicons name="swap-vertical-outline" size={13} color={Colors.primary} />
              <Text style={styles.reorderToggleBtnText}>Sắp xếp</Text>
            </TouchableOpacity>
          )}
        </View>

        {reorderMode && (
          <View style={styles.reorderBanner}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
            <Text style={styles.reorderBannerText}>
              Nhấn ↑ ↓ để thay đổi thứ tự. Nhấn Xong để cập nhật bản đồ.
            </Text>
          </View>
        )}

        <View style={styles.stopList}>
          {orderedStops.map((stop, idx) => (
            <StopOrderCard
              key={stop.id}
              stop={stop}
              reorderMode={reorderMode}
              canMoveUp={idx > 0}
              canMoveDown={idx < orderedStops.length - 1}
              onMoveUp={() => moveStop(stop.id, 'up')}
              onMoveDown={() => moveStop(stop.id, 'down')}
            />
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.hubBtn, pressed && { opacity: 0.85 }]}
          onPress={handleGoToHub}
        >
          <Ionicons name="cube-outline" size={18} color={Colors.onPrimary} />
          <Text style={styles.hubBtnText}>Nhận hàng tại Hub</Text>
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
              <Text style={styles.modalSub}>{route.serviceDate} · {route.totalStops} điểm giao</Text>
            </View>
            <Pressable
              onPress={() => setShowRouteMap(false)}
              hitSlop={12}
              style={styles.closeBtn}
            >
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

  // Greeting
  greetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
  },
  greetTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  greetSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  vehiclePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  vehiclePlate: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Route summary card
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  routeDate: { fontSize: 12, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.outlineVariant },
  statVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statLbl: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  mapThumbWrap: {
    borderRadius: 12, overflow: 'hidden',
    height: 150,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  mapThumb: { flex: 1, borderRadius: 0 },
  mapThumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingBottom: 8, alignItems: 'flex-end',
  },
  mapThumbBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  mapThumbBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Stop order section
  stopSectionHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 4,
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
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  reorderDoneBtnText: { fontSize: 12, fontWeight: '700', color: Colors.onPrimary },

  reorderBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10, padding: 10,
  },
  reorderBannerText: {
    flex: 1, fontSize: 12, color: Colors.primary,
    fontWeight: '600', lineHeight: 17,
  },

  stopList: { gap: 8 },
  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  stopCardReorder: { borderColor: Colors.primary + '30' },
  stopNumBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  stopInfo: { flex: 1, gap: 4 },
  stopName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  stopAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopAddress: { flex: 1, fontSize: 11, color: Colors.textMuted },

  reorderBtns: { justifyContent: 'center', gap: 2, flexShrink: 0 },
  reorderArrow: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  reorderArrowDisabled: { backgroundColor: Colors.surfaceContainerHigh },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    padding: 16,
  },
  hubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 15,
  },
  hubBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  // Map modal
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
