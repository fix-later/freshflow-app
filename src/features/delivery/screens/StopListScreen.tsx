import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_STOPS, type MockStop, type StopStatus } from '../mockData';
import { stopStatusStore, isRouteComplete } from '../stopStatusStore';

type Props = NativeStackScreenProps<DriverStackParamList, 'StopList'>;

const STATUS_CONFIG: Record<StopStatus, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending: { label: 'Chờ giao', color: '#6B7280', icon: 'time-outline' },
  arrived: { label: 'Đã tới', color: Colors.warning, icon: 'location' },
  delivered: { label: 'Đã giao', color: Colors.success, icon: 'checkmark-circle' },
  failed: { label: 'Không giao được', color: Colors.danger, icon: 'close-circle' },
};

function StopCard({
  stop,
  status,
  onPress,
}: {
  stop: MockStop;
  status: StopStatus;
  onPress: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const isDone = status === 'delivered' || status === 'failed';
  const totalQty = stop.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, isDone && styles.cardDone, pressed && { opacity: 0.75 }]}
      onPress={onPress}
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

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.address} numberOfLines={1}>{stop.address}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="cube-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.meta}>{stop.items.length} loại · {totalQty} đơn vị</Text>
        </View>

        {!isDone && (
          <Pressable style={styles.navBtn} onPress={onPress}>
            <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
            <Text style={styles.navBtnText}>Điều hướng</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function RouteCompleteView({ delivered, failed, onGoHome }: {
  delivered: number;
  failed: number;
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

      <Pressable style={styles.goHomeBtn} onPress={onGoHome}>
        <Ionicons name="home-outline" size={18} color={Colors.onPrimary} />
        <Text style={styles.goHomeBtnText}>Về trang chủ</Text>
      </Pressable>
    </View>
  );
}

export function StopListScreen({ route, navigation }: Props) {
  const { routeId: _routeId } = route.params; // reserved for API call

  const [statuses, setStatuses] = useState<Record<string, StopStatus>>(
    () => ({ ...stopStatusStore }),
  );
  const [routeCompleted, setRouteCompleted] = useState(false);

  // Refresh statuses from shared store every time screen is focused
  useFocusEffect(
    useCallback(() => {
      setStatuses({ ...stopStatusStore });
      if (isRouteComplete()) setRouteCompleted(true);
    }, []),
  );

  const stopsWithStatus = MOCK_STOPS.map(s => ({
    ...s,
    status: statuses[s.id] ?? s.status,
  }));

  const delivered = stopsWithStatus.filter(s => s.status === 'delivered').length;
  const failed = stopsWithStatus.filter(s => s.status === 'failed').length;
  const done = delivered + failed;
  const allDone = done === stopsWithStatus.length;
  const pct = Math.round((done / stopsWithStatus.length) * 100);

  const handleCompleteRoute = () => {
    Alert.alert(
      'Hoàn tất tuyến đường',
      `Xác nhận kết thúc ca giao hàng?\n\n✅ ${delivered} điểm giao thành công\n❌ ${failed} điểm không giao được`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Hoàn tất',
          onPress: () => {
            // TODO: await driverApi.completeRoute(routeId)
            setRouteCompleted(true);
          },
        },
      ],
    );
  };

  if (routeCompleted) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <RouteCompleteView
          delivered={delivered}
          failed={failed}
          onGoHome={() => navigation.popToTop()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={stopsWithStatus}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <StopCard
            stop={item}
            status={item.status}
            onPress={() => navigation.navigate('DriverNavigation', { stopId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View>
                  <Text style={styles.progressTitle}>Tiến độ</Text>
                  <Text style={styles.progressFrac}>{done}/{stopsWithStatus.length} điểm đã xong</Text>
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
                  <Text style={styles.progressMetaText}>{stopsWithStatus.length - done} còn lại</Text>
                </View>
              </View>
            </View>
            <Text style={styles.listLabel}>Danh sách điểm giao</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: allDone ? 120 : 16 }} />}
      />

      {/* ── Hoàn tất tuyến footer ── */}
      {allDone && (
        <View style={styles.completeFooter}>
          <View style={styles.completeFooterInfo}>
            <Ionicons name="flag" size={18} color={Colors.success} />
            <Text style={styles.completeFooterText}>
              Tất cả {stopsWithStatus.length} điểm đã hoàn tất!
            </Text>
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
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { flex: 1, fontSize: 12, color: Colors.textSecondary },
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
});
