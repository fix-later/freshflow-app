import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { driverApi } from '../api/driverApi';
import { driverRouteStore, type DeliveryStop } from '../store/driverRouteStore';

type Props = NativeStackScreenProps<DriverStackParamList, 'PickupConfirm'>;

function PackageCard({
  stop,
  checked,
  onToggle,
}: {
  stop: DeliveryStop;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, checked && styles.cardChecked, pressed && { opacity: 0.8 }]}
      onPress={onToggle}
    >
      <View style={[styles.stopNum, checked && styles.stopNumChecked]}>
        <Text style={[styles.stopNumText, checked && styles.stopNumTextChecked]}>{stop.order}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{stop.restaurantName}</Text>
        <Text style={styles.cardMeta}>Đơn #{stop.orderId.slice(0, 8).toUpperCase()}</Text>
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </Pressable>
  );
}

export function PickupConfirmScreen({ route, navigation }: Props) {
  const { routeId } = route.params;

  const [loading, setLoading] = useState(driverRouteStore.getStops().length === 0);
  const [stops, setStops] = useState<DeliveryStop[]>(driverRouteStore.getStops());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (driverRouteStore.getStops().length === 0) {
        setLoading(true);
        driverRouteStore.load().finally(() => {
          setStops(driverRouteStore.getStops());
          setLoading(false);
        });
      } else {
        setStops(driverRouteStore.getStops());
        setLoading(false);
      }
    }, []),
  );

  const hub = driverRouteStore.getHubStop();

  const toggleStop = (deliveryId: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(deliveryId)) next.delete(deliveryId);
      else next.add(deliveryId);
      return next;
    });
  };

  const allChecked = stops.length > 0 && checked.size === stops.length;

  const handleConfirm = () => {
    Alert.alert(
      'Xác nhận đã nhận hàng',
      `Bạn xác nhận đã nhận đủ hàng cho ${stops.length} đơn từ ${hub?.entityName ?? 'hub'}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setConfirming(true);
            try {
              await driverApi.confirmPickup(routeId, stops.map(s => s.orderId));
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

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={stops}
        keyExtractor={stop => stop.deliveryId}
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
                Nhấn vào từng đơn để đánh dấu đã nhận. Xác nhận khi đã nhận đủ tất cả.
              </Text>
            </View>

            {/* Progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Đã kiểm tra</Text>
              <Text style={styles.progressCount}>
                <Text style={styles.progressHighlight}>{checked.size}</Text>/{stops.length} đơn
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Danh sách đơn cần nhận</Text>
          </>
        }
        renderItem={({ item }) => (
          <PackageCard
            stop={item}
            checked={checked.has(item.deliveryId)}
            onToggle={() => toggleStop(item.deliveryId)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>
            {allChecked ? 'Đã kiểm tra toàn bộ đơn hàng' : `Còn ${stops.length - checked.size} đơn chưa kiểm tra`}
          </Text>
          <Text style={styles.footerSub}>{stops.length} điểm giao</Text>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  progressLabel: { fontSize: 13, color: Colors.textSecondary },
  progressCount: { fontSize: 13, color: Colors.textSecondary },
  progressHighlight: { fontWeight: '800', color: Colors.primary },

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
