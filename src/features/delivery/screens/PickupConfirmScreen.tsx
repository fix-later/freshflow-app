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
import { type LoadingLineDto, type LoadingManifestDto } from '../types/delivery.types';

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
  lines: LoadingLineDto[];
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
    const linesByOrder = new Map<string, LoadingLineDto[]>();
    for (const line of stop.lines) {
      const existing = linesByOrder.get(line.orderId) ?? [];
      existing.push(line);
      linesByOrder.set(line.orderId, existing);
    }
    for (const [orderId, lines] of linesByOrder) {
      seq += 1;
      items.push({
        orderId,
        order: seq,
        restaurantName: stop.restaurantName,
        lineCount: lines.length,
        lines,
      });
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
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[styles.cardContainer, checked && styles.cardContainerChecked]}>
      <Pressable
        style={({ pressed }) => [styles.cardHeader, pressed && { opacity: 0.8 }]}
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
        {item.lines.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.expandBtn, pressed && { opacity: 0.6 }]}
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(prev => !prev);
            }}
            hitSlop={8}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </Pressable>
        )}
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </Pressable>

      {expanded && item.lines.length > 0 && (
        <View style={styles.itemsList}>
          {item.lines.map((line, idx) => (
            <View key={line.orderItemId || `${line.orderId}-${idx}`} style={styles.itemRow}>
              <View style={styles.itemBullet} />
              <Text style={styles.itemName} numberOfLines={1}>
                {line.productName}
              </Text>
              <Text style={styles.itemQty}>x{line.quantity}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
      if (manifest && manifest.stops) {
        driverRouteStore.setManifestStops(manifest.stops);
      }
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
              // Deliveries now exist server-side for the first time. Reload store to sync deliveries.
              const reloadedRoute = await driverRouteStore.load();
              // startRoute only accepts routes in 'assigned' status (BE rejects anything else with 409).
              if (reloadedRoute && reloadedRoute.status === 'assigned') {
                await driverApi.startRoute(routeId);
                driverRouteStore.setRouteStatus('in_progress');
              }
              navigation.replace('StopList', { routeId });
            } catch {
              Alert.alert('Lỗi', 'Không thể xác nhận nhận hàng hoặc bắt đầu tuyến đường. Vui lòng thử lại.');
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
          <ActivityIndicator size="large" color={Colors.driverPrimary} />
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
            <Ionicons name="refresh" size={18} color={Colors.driverOnPrimary} />
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
                  <Ionicons name="business-outline" size={28} color={Colors.driverPrimary} />
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
                    color={Colors.driverPrimary}
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
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng sẵn sàng tại Hub</Text>
            <Text style={styles.emptySub}>
              Chưa có đơn hàng nào sẵn sàng để nhận tại Hub cho tuyến này. Vui lòng đợi nhân viên Hub bàn giao.
            </Text>
          </View>
        }
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
          <Ionicons name="checkmark-circle" size={18} color={Colors.driverOnPrimary} />
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
    backgroundColor: Colors.driverPrimary,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.driverOnPrimary },
  list: { padding: 16, paddingBottom: 0 },

  emptyCard: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 24, gap: 10,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginTop: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  hubCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.driverPrimaryLight,
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
  progressHighlight: { fontWeight: '800', color: Colors.driverPrimary },

  selectAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.driverPrimary,
    backgroundColor: Colors.driverPrimaryLight,
  },
  selectAllBtnText: { fontSize: 11, fontWeight: '700', color: Colors.driverPrimary },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },

  cardContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  cardContainerChecked: {
    borderColor: Colors.driverPrimary + '60',
    backgroundColor: Colors.driverPrimaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  expandBtn: {
    padding: 4,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '70',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.driverPrimary,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.driverPrimary,
  },

  stopNum: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumChecked: { backgroundColor: Colors.driverPrimary },
  stopNumText: { fontSize: 14, fontWeight: '800', color: Colors.textMuted },
  stopNumTextChecked: { color: Colors.driverOnPrimary },

  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  cardMeta: { fontSize: 11, color: Colors.textMuted },

  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.driverPrimary, borderColor: Colors.driverPrimary },

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
    gap: 8, backgroundColor: Colors.driverPrimary,
    borderRadius: 14, paddingVertical: 14,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: Colors.driverOnPrimary, fontWeight: '700', fontSize: 15 },
});
