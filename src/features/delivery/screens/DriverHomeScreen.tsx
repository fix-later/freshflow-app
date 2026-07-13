import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { RouteOverviewMap } from '../../../components/RouteOverviewMap';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_ROUTE, MOCK_STOPS } from '../mockData';

type Nav = NativeStackNavigationProp<DriverStackParamList>;

const STATUS_CONFIG = {
  pending: {
    label: 'Chờ bắt đầu',
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: 'time-outline' as const,
  },
  in_progress: {
    label: 'Đang giao',
    color: Colors.primary,
    bg: Colors.primaryLight,
    icon: 'bicycle-outline' as const,
  },
  completed: {
    label: 'Hoàn thành',
    color: Colors.success,
    bg: Colors.successLight,
    icon: 'checkmark-circle-outline' as const,
  },
};

const LEGEND = [
  { color: '#9CA3AF', label: 'Chờ giao' },
  { color: '#F59E0B', label: 'Đã tới' },
  { color: '#006b2c', label: 'Đã giao' },
  { color: '#EF4444', label: 'Thất bại' },
  { color: '#3B82F6', label: 'Vị trí bạn' },
];

export function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();
  // TODO: replace MOCK_ROUTE with API call: await driverApi.getTodayRoute()
  const route = MOCK_ROUTE;
  const cfg = STATUS_CONFIG[route.status];
  const pct = Math.round((route.completedStops / route.totalStops) * 100);

  const [showRouteMap, setShowRouteMap] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | undefined>(undefined);
  const [currentLng, setCurrentLng] = useState<number | undefined>(undefined);

  const handleShowRouteMap = async () => {
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

        {/* ── Today's route ── */}
        <Text style={styles.sectionTitle}>Tuyến đường hôm nay</Text>
        <View style={styles.routeCard}>

          {/* Status + date */}
          <View style={styles.routeCardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={13} color={cfg.color} />
              <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.routeDate}>{route.serviceDate}</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Tiến độ giao hàng</Text>
              <Text style={styles.progressFrac}>
                {route.completedStops}/{route.totalStops} điểm
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={22} color={Colors.primary} />
              <Text style={styles.statVal}>{route.totalStops}</Text>
              <Text style={styles.statLbl}>Điểm dừng</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done-outline" size={22} color={Colors.success} />
              <Text style={styles.statVal}>{route.completedStops}</Text>
              <Text style={styles.statLbl}>Đã giao</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={22} color={Colors.secondary} />
              <Text style={styles.statVal}>{route.totalDistanceKm}km</Text>
              <Text style={styles.statLbl}>Quãng đường</Text>
            </View>
          </View>

          {/* Map preview thumbnail — tap to open fullscreen */}
          <Pressable onPress={handleShowRouteMap} style={styles.mapThumbWrap}>
            <RouteOverviewMap
              stops={MOCK_STOPS}
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

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('PickupConfirm', { routeId: route.id })}
          >
            <Ionicons name="cube-outline" size={18} color={Colors.onPrimary} />
            <Text style={styles.ctaBtnText}>Nhận hàng tại Hub</Text>
          </Pressable>
        </View>

        {/* ── Info ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Tuyến đường được tối ưu tự động. Liên hệ điều phối viên nếu cần điều chỉnh.
          </Text>
        </View>
      </ScrollView>

      {/* ── Route Map Modal ── */}
      <Modal
        visible={showRouteMap}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRouteMap(false)}
      >
        <SafeAreaView style={styles.modalScreen}>
          {/* Modal header */}
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

          {/* Legend */}
          <View style={styles.legend}>
            {LEGEND.map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Map */}
          <RouteOverviewMap
            stops={MOCK_STOPS}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  vehiclePlate: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  routeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  routeDate: { fontSize: 12, color: Colors.textMuted },

  progressWrap: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, color: Colors.textSecondary },
  progressFrac: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.outlineVariant },
  statVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statLbl: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  mapThumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  mapThumb: { flex: 1, borderRadius: 0 },
  mapThumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingBottom: 8,
    alignItems: 'flex-end',
  },
  mapThumbBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  mapThumbBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ctaBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.secondary, lineHeight: 17 },

  // Modal
  modalScreen: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: Colors.textSecondary },

  fullMap: { flex: 1 },
});
