import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import type { HubStackParamList } from '../../../navigation/types';
import { HUB_BATCHES } from '../data/hubOperations';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

const STATUS = {
  approaching: { label: 'Đang tới', color: Colors.secondary, background: '#E8F4FC' },
  waiting: { label: 'Chờ nhận', color: '#8A5900', background: Colors.warningLight },
  checking: { label: 'Đang kiểm đếm', color: '#7445A5', background: '#F1E9FA' },
  quality_check: { label: 'Kiểm chất lượng', color: '#9A5B00', background: '#FFF3D6' },
  completed: { label: 'Hoàn tất', color: Colors.success, background: Colors.successLight },
} as const;

export function InboundQueueScreen() {
  const navigation = useNavigation<Navigation>();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>KHU VỰC NHẬN HÀNG · CỬA 1-3</Text>
          <Text style={styles.title}>Lô hàng trong ngày</Text>
          <Text style={styles.subtitle}>3 lô đang xử lý · 1.240 kg dự kiến</Text>
        </View>
        <View style={styles.filterRow}>
          <View style={[styles.filterChip, styles.filterChipActive]}><Text style={styles.filterTextActive}>Đang chờ  3</Text></View>
          <View style={styles.filterChip}><Text style={styles.filterText}>Đã nhận  1</Text></View>
          <Pressable accessibilityLabel="Quét mã lô hàng" style={styles.scanButton} onPress={() => navigation.navigate('CheckIn', { batchId: HUB_BATCHES[0].id })}>
            <Ionicons name="scan-outline" size={19} color={Colors.onPrimary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {HUB_BATCHES.map((batch) => {
            const status = STATUS[batch.status];
            return (
              <Pressable key={batch.id} style={styles.card} onPress={() => navigation.navigate('CheckIn', { batchId: batch.id })}>
                <View style={styles.cardTop}>
                  <View><Text style={styles.code}>{batch.code}</Text><Text style={styles.market}>{batch.marketName}</Text></View>
                  <View style={[styles.statusBadge, { backgroundColor: status.background }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
                </View>
                <View style={styles.infoGrid}>
                  <Info icon="time-outline" label="Giờ đến" value={batch.arrivalTime} />
                  <Info icon="scale-outline" label="Khối lượng" value={`${batch.totalKg} kg`} />
                  <Info icon="car-outline" label="Phương tiện" value={batch.vehicle} />
                  <Info icon="person-outline" label="Người giao" value={batch.driver} />
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.productCount}>{batch.products.length} mặt hàng cần kiểm</Text>
                  <View style={styles.openAction}><Text style={styles.openActionText}>Mở lô hàng</Text><Ionicons name="arrow-forward" size={15} color={Colors.primary} /></View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.info}><View style={styles.infoIcon}><Ionicons name={icon} size={16} color={Colors.textSecondary} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={1} style={styles.infoValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 18 },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  title: { color: Colors.onPrimary, fontSize: 20, fontWeight: '800', marginTop: 5 },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { height: 34, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.successLight },
  filterText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  scanButton: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 28, gap: 11 },
  card: { borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  code: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  market: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: '800' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 11, marginTop: 14 },
  info: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 5 },
  infoIcon: { width: 29, height: 29, borderRadius: 7, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 8, color: Colors.textMuted },
  infoValue: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  cardFooter: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh, marginTop: 13, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productCount: { fontSize: 9, color: Colors.textMuted },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openActionText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
});
