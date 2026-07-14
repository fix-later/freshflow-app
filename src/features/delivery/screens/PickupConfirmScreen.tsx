import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_HUB, MOCK_STOPS } from '../mockData';
import { stopOrderStore } from '../stopOrderStore';

type Props = NativeStackScreenProps<DriverStackParamList, 'PickupConfirm'>;

function PackageCard({
  stop,
  displayOrder,
  checked,
  onToggle,
}: {
  stop: (typeof MOCK_STOPS)[0];
  displayOrder: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const totalQty = stop.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, checked && styles.cardChecked, pressed && { opacity: 0.8 }]}
      onPress={onToggle}
    >
      <View style={[styles.stopNum, checked && styles.stopNumChecked]}>
        <Text style={[styles.stopNumText, checked && styles.stopNumTextChecked]}>
          {displayOrder}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{stop.restaurantName}</Text>
        <View style={styles.itemsRow}>
          {stop.items.map((item, i) => (
            <Text key={i} style={styles.itemChip}>
              {item.name} {item.quantity}{item.unit}
            </Text>
          ))}
        </View>
        <Text style={styles.cardMeta}>{stop.items.length} loại · {totalQty} đơn vị</Text>
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </Pressable>
  );
}

export function PickupConfirmScreen({ route, navigation }: Props) {
  const { routeId } = route.params;
  const hub = MOCK_HUB;

  // Show items in the driver's chosen delivery order (set on DriverHomeScreen)
  const orderedIds = stopOrderStore.isEmpty()
    ? MOCK_STOPS.map(s => s.id)
    : stopOrderStore.get();
  const orderedStops = orderedIds.map((id, idx) => ({
    stop: MOCK_STOPS.find(s => s.id === id)!,
    displayOrder: idx + 1,
  }));

  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleStop = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = checked.size === orderedStops.length;
  const totalItems = orderedStops.reduce(
    (s, { stop }) => s + stop.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );

  const handleConfirm = () => {
    Alert.alert(
      'Xác nhận đã nhận hàng',
      `Bạn xác nhận đã nhận đủ ${totalItems} đơn vị hàng từ ${hub.name}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            // TODO: await driverApi.confirmPickup(routeId)
            navigation.replace('StopList', { routeId });
          },
        },
      ],
    );
  };

  const handleCallHub = () => {
    Linking.openURL(`tel:${hub.contactPhone.replace(/\s/g, '')}`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={orderedStops}
        keyExtractor={({ stop }) => stop.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Hub info */}
            <View style={styles.hubCard}>
              <View style={styles.hubIconWrap}>
                <Ionicons name="business-outline" size={28} color={Colors.primary} />
              </View>
              <View style={styles.hubInfo}>
                <Text style={styles.hubName}>{hub.name}</Text>
                <View style={styles.hubAddressRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.hubAddress}>{hub.address}</Text>
                </View>
              </View>
              <Pressable style={styles.callHubBtn} onPress={handleCallHub}>
                <Ionicons name="call" size={16} color={Colors.onPrimary} />
              </Pressable>
            </View>

            {/* Instructions */}
            <View style={styles.instructBox}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.secondary} />
              <Text style={styles.instructText}>
                Nhấn vào từng kiện hàng để đánh dấu đã nhận. Xác nhận khi đã nhận đủ tất cả.
              </Text>
            </View>

            {/* Progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Đã kiểm tra</Text>
              <Text style={styles.progressCount}>
                <Text style={styles.progressHighlight}>{checked.size}</Text>/{orderedStops.length} kiện
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Danh sách hàng cần nhận</Text>
          </>
        }
        renderItem={({ item: { stop, displayOrder } }) => (
          <PackageCard
            stop={stop}
            displayOrder={displayOrder}
            checked={checked.has(stop.id)}
            onToggle={() => toggleStop(stop.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>
            {allChecked
              ? 'Đã kiểm tra toàn bộ hàng hoá'
              : `Còn ${orderedStops.length - checked.size} kiện chưa kiểm tra`}
          </Text>
          <Text style={styles.footerSub}>{orderedStops.length} điểm · {totalItems} đơn vị</Text>
        </View>
        <Pressable
          style={[styles.confirmBtn, !allChecked && styles.confirmBtnDisabled]}
          onPress={allChecked ? handleConfirm : undefined}
          disabled={!allChecked}
        >
          <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
          <Text style={styles.confirmBtnText}>Xác nhận nhận hàng</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
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
  hubAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  hubAddress: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  callHubBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

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
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  itemChip: {
    fontSize: 11, color: Colors.textSecondary,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
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
