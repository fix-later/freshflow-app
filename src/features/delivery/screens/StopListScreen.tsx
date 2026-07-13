import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_STOPS, type MockStop, type StopStatus } from '../mockData';

type Props = NativeStackScreenProps<DriverStackParamList, 'StopList'>;

const STATUS_CONFIG: Record<StopStatus, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending: { label: 'Chờ giao', color: '#6B7280', icon: 'time-outline' },
  arrived: { label: 'Đã tới', color: Colors.warning, icon: 'location' },
  delivered: { label: 'Đã giao', color: Colors.success, icon: 'checkmark-circle' },
  failed: { label: 'Không giao được', color: Colors.danger, icon: 'close-circle' },
};

function StopCard({
  stop,
  onPress,
}: {
  stop: MockStop;
  onPress: () => void;
}) {
  const cfg = STATUS_CONFIG[stop.status];
  const isDone = stop.status === 'delivered' || stop.status === 'failed';
  const totalQty = stop.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, isDone && styles.cardDone, pressed && { opacity: 0.75 }]}
      onPress={onPress}
    >
      {/* Order number badge */}
      <View style={[styles.numBadge, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
        <Text style={[styles.numText, { color: cfg.color }]}>{stop.order}</Text>
      </View>

      {/* Info */}
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

export function StopListScreen({ navigation }: Props) {
  // TODO: replace MOCK_STOPS with API call using route.params.routeId
  const stops = MOCK_STOPS;
  const delivered = stops.filter(s => s.status === 'delivered').length;
  const pct = Math.round((delivered / stops.length) * 100);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={stops}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <StopCard
            stop={item}
            onPress={() => navigation.navigate('DriverNavigation', { stopId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Progress card */}
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View>
                  <Text style={styles.progressTitle}>Tiến độ</Text>
                  <Text style={styles.progressFrac}>{delivered}/{stops.length} điểm đã giao</Text>
                </View>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
            </View>

            <Text style={styles.listLabel}>Danh sách điểm giao</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: 16 }} />}
      />
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
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },

  listLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardDone: { opacity: 0.65 },

  numBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  numText: { fontSize: 15, fontWeight: '800' },

  info: { flex: 1, gap: 4 },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  nameDone: { color: Colors.textMuted },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusChipText: { fontSize: 10, fontWeight: '700' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { flex: 1, fontSize: 12, color: Colors.textSecondary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: Colors.textMuted },

  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  navBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});
