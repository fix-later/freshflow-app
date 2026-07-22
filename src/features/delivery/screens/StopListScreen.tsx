import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { driverRouteStore, type DeliveryStop } from '../store/driverRouteStore';
import { type DeliveryStatus } from '../types/delivery.types';

type Props = NativeStackScreenProps<DriverStackParamList, 'StopList'>;

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending: { label: 'Chờ giao', color: '#6B7280', icon: 'time-outline' },
  arrived: { label: 'Đã tới', color: Colors.warning, icon: 'location' },
  delivered: { label: 'Đã giao', color: Colors.success, icon: 'checkmark-circle' },
  failed: { label: 'Không giao được', color: Colors.danger, icon: 'close-circle' },
};

function StopCard({
  stop,
  onPress,
  reorderMode,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  stop: DeliveryStop;
  onPress: () => void;
  reorderMode?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const cfg = STATUS_CONFIG[stop.status];
  const isDone = stop.status === 'delivered' || stop.status === 'failed';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, isDone && styles.cardDone, pressed && { opacity: 0.75 }]}
      onPress={!reorderMode ? onPress : undefined}
    >
      <View style={[styles.numBadge, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
        <Text style={[styles.numText, { color: cfg.color }]}>{stop.order}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={[styles.name, isDone && styles.nameDone]} numberOfLines={1}>
            {stop.restaurantName}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[styles.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="receipt-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.meta}>Đơn #{stop.orderId.slice(0, 8).toUpperCase()}</Text>
        </View>
        {!isDone && !reorderMode && (
          <View style={styles.navBtn}>
            <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
            <Text style={styles.navBtnText}>Điều hướng</Text>
          </View>
        )}
      </View>
      {/* Reorder arrows — only on moveable (non-done) stops */}
      {reorderMode && !isDone && (
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
      {reorderMode && isDone && (
        <View style={styles.reorderLockedBadge}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

function RouteCompleteView({ delivered, failed, durationText, onGoHome }: {
  delivered: number;
  failed: number;
  durationText: string;
  onGoHome: () => void;
}) {
  return (
    <View style={styles.completeView}>
      <View style={styles.completeCircle}>
        <Ionicons name="flag" size={40} color={Colors.onPrimary} />
      </View>
      <Text style={styles.completeTitle}>Tuyến đường hoàn tất!</Text>
      <Text style={styles.completeSub}>Bạn đã hoàn thành ca giao hàng hôm nay.</Text>
      <View style={styles.completeSummaryCard}>
        <View style={styles.completeStat}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.completeStatVal}>{delivered}</Text>
          <Text style={styles.completeStatLbl}>Giao thành công</Text>
        </View>
        <View style={styles.completeStatDivider} />
        <View style={styles.completeStat}>
          <Ionicons name="close-circle" size={24} color={Colors.danger} />
          <Text style={styles.completeStatVal}>{failed}</Text>
          <Text style={styles.completeStatLbl}>Không giao được</Text>
        </View>
        <View style={styles.completeStatDivider} />
        <View style={styles.completeStat}>
          <Ionicons name="location" size={24} color={Colors.primary} />
          <Text style={styles.completeStatVal}>{delivered + failed}</Text>
          <Text style={styles.completeStatLbl}>Tổng điểm</Text>
        </View>
      </View>
      <View style={styles.shiftCard}>
        <View style={styles.shiftStat}>
          <Ionicons name="time-outline" size={20} color={Colors.secondary} />
          <Text style={styles.shiftStatVal}>{durationText}</Text>
          <Text style={styles.shiftStatLbl}>Thời gian ca</Text>
        </View>
      </View>
      <Pressable style={styles.goHomeBtn} onPress={onGoHome}>
        <Ionicons name="home-outline" size={18} color={Colors.onPrimary} />
        <Text style={styles.goHomeBtnText}>Về trang chủ</Text>
      </Pressable>
    </View>
  );
}

export function StopListScreen({ route, navigation }: Props) {
  const { routeId: _routeId } = route.params;
  const shiftStartRef = useRef(Date.now());
  const [loading, setLoading] = useState(driverRouteStore.getStops().length === 0);
  const [stops, setStops] = useState<DeliveryStop[]>(driverRouteStore.getStops());
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [durationText, setDurationText] = useState('');
  const [reorderMode, setReorderMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (driverRouteStore.getStops().length === 0) {
        setLoading(true);
        driverRouteStore.load().finally(() => {
          setStops(driverRouteStore.getStops());
          setLoading(false);
        });
      } else {
        setStops([...driverRouteStore.getStops()]);
        setLoading(false);
      }
    }, []),
  );

  const moveStop = (deliveryId: string, dir: 'up' | 'down') => {
    setStops(prev => {
      const idx = prev.findIndex(s => s.deliveryId === deliveryId);
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const target = prev[targetIdx];
      if (target.status === 'delivered' || target.status === 'failed') return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      driverRouteStore.setStopOrder(next.map(s => s.deliveryId));
      return driverRouteStore.getStops();
    });
  };

  const delivered = stops.filter(s => s.status === 'delivered').length;
  const failed = stops.filter(s => s.status === 'failed').length;
  const done = delivered + failed;
  const allDone = stops.length > 0 && done === stops.length;
  const pct = stops.length > 0 ? Math.round((done / stops.length) * 100) : 0;

  const handleCompleteRoute = () => {
    Alert.alert(
      'Hoàn tất tuyến đường',
      `Xác nhận kết thúc ca giao hàng?\n\n✅ ${delivered} điểm giao thành công\n❌ ${failed} điểm không giao được`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Hoàn tất',
          onPress: () => {
            const mins = Math.floor((Date.now() - shiftStartRef.current) / 60000);
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            setDurationText(h > 0 ? `${h}g ${m}ph` : `${m} phút`);
            // No backend endpoint to mark the route as completed yet — this is a
            // client-side summary screen only.
            setRouteCompleted(true);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (routeCompleted) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <RouteCompleteView
          delivered={delivered}
          failed={failed}
          durationText={durationText}
          onGoHome={() => {
            // Clear the finished route so DriverHomeScreen's focus-effect guard
            // (which otherwise only reloads once) fetches fresh instead of
            // re-showing this now-completed route.
            driverRouteStore.reset();
            navigation.popToTop();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={stops}
        keyExtractor={item => item.deliveryId}
        renderItem={({ item, index }) => {
          const isDone = item.status === 'delivered' || item.status === 'failed';
          const prev = stops[index - 1];
          const canMoveUp = !isDone && index > 0 && prev.status !== 'delivered' && prev.status !== 'failed';
          const canMoveDown = !isDone && index < stops.length - 1;
          return (
            <StopCard
              stop={item}
              onPress={() => navigation.navigate('DriverNavigation', { deliveryId: item.deliveryId })}
              reorderMode={reorderMode}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              onMoveUp={() => moveStop(item.deliveryId, 'up')}
              onMoveDown={() => moveStop(item.deliveryId, 'down')}
            />
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View>
                  <Text style={styles.progressTitle}>Tiến độ</Text>
                  <Text style={styles.progressFrac}>{done}/{stops.length} điểm đã xong</Text>
                </View>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <View style={styles.progressMeta}>
                <View style={styles.progressMetaItem}>
                  <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.progressMetaText}>{delivered} đã giao</Text>
                </View>
                <View style={styles.progressMetaItem}>
                  <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                  <Text style={styles.progressMetaText}>{failed} không giao được</Text>
                </View>
                <View style={styles.progressMetaItem}>
                  <View style={[styles.dot, { backgroundColor: '#6B7280' }]} />
                  <Text style={styles.progressMetaText}>{stops.length - done} còn lại</Text>
                </View>
              </View>
            </View>
            <View style={styles.listLabelRow}>
              <Text style={styles.listLabel}>Danh sách điểm giao</Text>
              {!allDone && (
                reorderMode ? (
                  <TouchableOpacity style={styles.reorderDoneBtn} onPress={() => setReorderMode(false)}>
                    <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />
                    <Text style={styles.reorderDoneBtnText}>Xong</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.reorderToggleBtn} onPress={() => setReorderMode(true)}>
                    <Ionicons name="swap-vertical-outline" size={13} color={Colors.primary} />
                    <Text style={styles.reorderToggleBtnText}>Sắp xếp lại</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            {reorderMode && (
              <View style={styles.reorderBanner}>
                <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
                <Text style={styles.reorderBannerText}>
                  Nhấn ↑ ↓ để điều chỉnh thứ tự giao hàng. Điểm đã xong không thể di chuyển.
                </Text>
              </View>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: allDone ? 120 : 16 }} />}
      />
      {allDone && (
        <View style={styles.completeFooter}>
          <View style={styles.completeFooterInfo}>
            <Ionicons name="flag" size={18} color={Colors.success} />
            <Text style={styles.completeFooterText}>Tất cả {stops.length} điểm đã hoàn tất!</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.completeBtn, pressed && { opacity: 0.85 }]}
            onPress={handleCompleteRoute}
          >
            <Ionicons name="checkmark-done-circle" size={18} color={Colors.onPrimary} />
            <Text style={styles.completeBtnText}>Hoàn tất tuyến đường</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  header: { gap: 14, marginBottom: 8 },
  progressCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  progressFrac: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  progressPct: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  progressTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  progressMeta: { flexDirection: 'row', gap: 12 },
  progressMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progressMetaText: { fontSize: 11, color: Colors.textMuted },
  listLabel: {
    fontSize: 12, fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12, gap: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  cardDone: { opacity: 0.6 },
  numBadge: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center',
    justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  numText: { fontSize: 15, fontWeight: '800' },
  info: { flex: 1, gap: 4 },
  infoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  nameDone: { color: Colors.textMuted },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0,
  },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: Colors.textMuted },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: Colors.primaryLight,
  },
  navBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  // Complete footer
  completeFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    padding: 16, gap: 10,
  },
  completeFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completeFooterText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 14,
  },
  completeBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
  // Route complete view
  completeView: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  completeCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  completeTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  completeSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  completeSummaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 16, marginTop: 4,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    width: '100%',
  },
  completeStat: { flex: 1, alignItems: 'center', gap: 6 },
  completeStatVal: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  completeStatLbl: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  completeStatDivider: { width: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: 4 },
  goHomeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 32, marginTop: 8,
  },
  goHomeBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
  shiftCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    width: '100%',
  },
  shiftStat: { flex: 1, alignItems: 'center', gap: 6 },
  shiftStatVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  shiftStatLbl: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  // Reorder mode
  listLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    marginTop: -4,
  },
  reorderBannerText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '600' },
  reorderBtns: { justifyContent: 'center', gap: 2, flexShrink: 0 },
  reorderArrow: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  reorderArrowDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  reorderLockedBadge: {
    width: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
