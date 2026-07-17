import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
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
                  <View><Text numeric style={styles.code}>{batch.code}</Text><Text style={styles.market}>{batch.marketName}</Text></View>
                  <View style={[styles.statusBadge, { backgroundColor: status.background }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
                </View>
                <View style={styles.infoGrid}>
                  <Info icon="time-outline" label="Giờ đến" value={batch.arrivalTime} numeric />
                  <Info icon="scale-outline" label="Khối lượng" value={`${batch.totalKg} kg`} numeric />
                  <Info icon="car-outline" label="Phương tiện" value={batch.vehicle} numeric />
                  <Info icon="person-outline" label="Người giao" value={batch.driver} />
                </View>
                <View style={styles.cardFooter}>
                  <Text numeric style={styles.productCount}>{batch.products.length} mặt hàng cần kiểm</Text>
                  <View style={styles.openAction}><Text style={styles.openActionText}>Mở lô hàng</Text><Ionicons name="arrow-forward" size={15} color={Colors.primaryText} /></View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Info({ icon, label, value, numeric = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; numeric?: boolean }) {
  return <View style={styles.info}><View style={styles.infoIcon}><Ionicons name={icon} size={16} color={Colors.primaryText} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>{label}</Text><Text numeric={numeric} numberOfLines={1} style={[styles.infoValue, numeric && styles.infoValueNumeric]}>{value}</Text></View></View>;
}

const CARD_SHADOW = {
  shadowColor: Colors.deepTeal,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.deepTeal },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.deepTeal,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  title: { color: Colors.white, fontSize: 20, fontWeight: '800', marginTop: 5 },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  filterText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { fontSize: 10, fontWeight: '800', color: Colors.primaryText },
  scanButton: { marginLeft: 'auto', width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW },
  list: { paddingHorizontal: 16, paddingBottom: 28, gap: 11 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 14, ...CARD_SHADOW },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  code: { fontSize: 14, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  market: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: '800' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 11, marginTop: 14 },
  info: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 5 },
  infoIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 8, color: Colors.textMuted },
  infoValue: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  infoValueNumeric: { fontFamily: Fonts.monoSemibold },
  cardFooter: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh, marginTop: 13, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productCount: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textMuted },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openActionText: { fontSize: 10, fontWeight: '800', color: Colors.primaryText },
});
