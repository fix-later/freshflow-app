import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { driverApi } from '../api/driverApi';
import { driverRouteStore } from '../store/driverRouteStore';
import { type LoadingManifestDto } from '../types/delivery.types';

type Props = NativeStackScreenProps<DriverStackParamList, 'PickupConfirm'>;

/**
 * One order to check off during hub pickup. Built from the loading manifest
 * (real orderIds, grouped per restaurant stop) rather than driverRouteStore's
 * stop list, which is keyed by `deliveries` — still empty at this point since
 * confirm-pickup is what creates those rows.
 */
interface PickupItem {
  orderId: string;
  order: number;
  restaurantName: string;
  lineCount: number;
}

function buildPickupItems(manifest: LoadingManifestDto): PickupItem[] {
  const items: PickupItem[] = [];
  const previewStops = driverRouteStore.getPickupPreviewStops();
  const customOrderMap = new Map(previewStops.map(s => [s.entityId, s.order]));

  // Loading order onto truck: Last-delivered stop (Stop N) loaded FIRST (innermost),
  // down to First-delivered stop (Stop 1) loaded LAST (outermost near truck door).
  const sortedStops = [...manifest.stops].sort((a, b) => {
    const orderA = customOrderMap.get(a.restaurantId) ?? a.stopOrder;
    const orderB = customOrderMap.get(b.restaurantId) ?? b.stopOrder;
    return orderB - orderA;
  });

  let seq = 0;
  for (const stop of sortedStops) {
    const lineCountByOrder = new Map<string, number>();
    for (const line of stop.lines) {
      lineCountByOrder.set(line.orderId, (lineCountByOrder.get(line.orderId) ?? 0) + 1);
    }
    for (const [orderId, lineCount] of lineCountByOrder) {
      seq += 1;
      items.push({ orderId, order: seq, restaurantName: stop.restaurantName, lineCount });
    }
  }
  return items;
}

function PackageCard({
  item,
  checked,
  onToggle,
}: {
  item: PickupItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, checked && styles.cardChecked, pressed && { opacity: 0.8 }]}
      onPress={onToggle}
    >
      <View style={[styles.stopNum, checked && styles.stopNumChecked]}>
        <Text style={[styles.stopNumText, checked && styles.stopNumTextChecked]}>{item.order}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.restaurantName}</Text>
        <Text style={styles.cardMeta}>
          Đơn #{item.orderId.slice(0, 8).toUpperCase()} · {item.lineCount} mặt hàng
        </Text>
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </Pressable>
  );
}

export function PickupConfirmScreen({ route, navigation }: Props) {
  const { routeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PickupItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const loadManifest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const manifest = await driverApi.getLoadingManifest(routeId);
      setItems(buildPickupItems(manifest));
    } catch {
      setError('Không thể tải danh sách hàng cần nhận. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useFocusEffect(
    useCallback(() => {
      loadManifest();
    }, [loadManifest]),
  );

  const hub = driverRouteStore.getHubStop();

  const toggleItem = (orderId: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const allChecked = items.length > 0 && checked.size === items.length;

  const toggleSelectAll = () => {
    if (allChecked) {
      setChecked(new Set());
    } else {
      setChecked(new Set(items.map(i => i.orderId)));
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      'Xác nhận đã nhận hàng',
      `Bạn xác nhận đã nhận đủ hàng cho ${items.length} đơn từ ${hub?.entityName ?? 'hub'}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setConfirming(true);
            try {
              await driverApi.confirmPickup(routeId, items.map(i => i.orderId));
              // Deliveries now exist server-side for the first time — refetch so
              // downstream screens (StopList etc.), which read driverRouteStore,
              // see the real per-order data instead of the stale empty list.
              await driverRouteStore.load();
              navigation.replace('StopList', { routeId });
            } catch {
              Alert.alert('Lỗi', 'Không thể xác nhận nhận hàng. Vui lòng thử lại.');
            } finally {
              setConfirming(false);
            }
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

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadManifest}>
            <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={item => item.orderId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Hub info */}
            {hub && (
              <View style={styles.hubCard}>
                <View style={styles.hubIconWrap}>
                  <Ionicons name="business-outline" size={28} color={Colors.primary} />
                </View>
                <View style={styles.hubInfo}>
                  <Text style={styles.hubName}>{hub.entityName}</Text>
                </View>
              </View>
            )}

            {/* Instructions */}
            <View style={styles.instructBox}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.secondary} />
              <Text style={styles.instructText}>
                Thứ tự bốc hàng được tự động sắp xếp theo tuyến đường bạn chọn: Hàng cho điểm giao cuối xếp vào sâu trong thùng xe trước ➔ Hàng cho điểm giao đầu xếp ngoài cửa xe sau cùng.
              </Text>
            </View>

            {/* Progress & Select All */}
            <View style={styles.progressRow}>
              <View style={{ gap: 2 }}>
                <Text style={styles.progressLabel}>Đã kiểm tra</Text>
                <Text style={styles.progressCount}>
                  <Text style={styles.progressHighlight}>{checked.size}</Text>/{items.length} đơn
                </Text>
              </View>
              {items.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.selectAllBtn, pressed && { opacity: 0.7 }]}
                  onPress={toggleSelectAll}
                >
                  <Ionicons
                    name={allChecked ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={styles.selectAllBtnText}>
                    {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.sectionTitle}>Danh sách đơn cần nhận</Text>
          </>
        }
        renderItem={({ item }) => (
          <PackageCard
            item={item}
            checked={checked.has(item.orderId)}
            onToggle={() => toggleItem(item.orderId)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>
            {allChecked ? 'Đã kiểm tra toàn bộ đơn hàng' : `Còn ${items.length - checked.size} đơn chưa kiểm tra`}
          </Text>
          <Text style={styles.footerSub}>{items.length} đơn</Text>
        </View>
        <Pressable
          style={[styles.confirmBtn, (!allChecked || confirming) && styles.confirmBtnDisabled]}
          onPress={allChecked && !confirming ? handleConfirm : undefined}
          disabled={!allChecked || confirming}
        >
          <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
          <Text style={styles.confirmBtnText}>{confirming ? 'Đang xác nhận...' : 'Xác nhận nhận hàng'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { maxWidth: 300, fontSize: 14, lineHeight: 20, textAlign: 'center', color: Colors.error },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 4, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11,
    backgroundColor: Colors.primary,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.onPrimary },
  list: { padding: 16, paddingBottom: 0 },

  hubCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  hubInfo: { flex: 1, gap: 3 },
  hubName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },

  instructBox: {
    flexDirection: 'row', gap: 7, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginBottom: 14,
  },
  instructText: { flex: 1, fontSize: 12, color: Colors.secondary, lineHeight: 17 },

  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  progressLabel: { fontSize: 12, color: Colors.textSecondary },
  progressCount: { fontSize: 13, color: Colors.textSecondary },
  progressHighlight: { fontWeight: '800', color: Colors.primary },

  selectAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  selectAllBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  cardChecked: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primaryLight,
  },
  stopNum: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumChecked: { backgroundColor: Colors.primary },
  stopNumText: { fontSize: 14, fontWeight: '800', color: Colors.textMuted },
  stopNumTextChecked: { color: Colors.onPrimary },

  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  cardMeta: { fontSize: 11, color: Colors.textMuted },

  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    padding: 16, gap: 10,
  },
  footerInfo: { gap: 2 },
  footerLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  footerSub: { fontSize: 11, color: Colors.textMuted },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 14,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
