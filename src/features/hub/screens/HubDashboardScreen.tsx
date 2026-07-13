import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import type { HubStackParamList } from '../../../navigation/types';
import { useAuth } from '../../auth';
import { HUB_BATCHES, MARKET_DISPATCHES } from '../data/hubOperations';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

const BATCH_STATUS = {
  approaching: { label: 'Đang tới', color: Colors.secondary, background: '#E8F4FC' },
  waiting: { label: 'Chờ nhận', color: '#8A5900', background: Colors.warningLight },
  checking: { label: 'Đang kiểm đếm', color: '#7445A5', background: '#F1E9FA' },
  quality_check: { label: 'Kiểm chất lượng', color: '#9A5B00', background: '#FFF3D6' },
  completed: { label: 'Đã nhận', color: Colors.success, background: Colors.successLight },
} as const;

export function HubDashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const displayName = user?.name?.trim() || 'Nhân viên Hub';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.greeting}>Chào buổi sáng,</Text>
              <Text numberOfLines={1} style={styles.userName}>{displayName}</Text>
              <Text style={styles.hubName}>Hub FreshFlow Tân Bình</Text>
            </View>
            <Pressable accessibilityLabel="Xem thông báo" style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={22} color={Colors.onPrimary} />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          <View style={styles.shiftCard}>
            <View style={styles.shiftIcon}><Ionicons name="time-outline" size={20} color={Colors.primary} /></View>
            <View style={styles.shiftCopy}>
              <Text style={styles.shiftLabel}>CA SÁNG · 05:30 - 13:30</Text>
              <Text style={styles.shiftText}>Thứ Hai, 13/07/2026</Text>
            </View>
            <View style={styles.onlineBadge}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Đang trực</Text></View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Metric icon="navigate-outline" value="2" label="Xe đi chợ" tone="blue" />
          <Metric icon="file-tray-full-outline" value="3" label="Lô chờ nhận" tone="green" />
          <Metric icon="layers-outline" value="2" label="Đơn phân loại" tone="amber" />
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Luồng công việc hôm nay</Text>
            <Text style={styles.sectionSubtitle}>10/16 tác vụ đã hoàn tất</Text>
          </View>
          <Text style={styles.progressPercent}>63%</Text>
        </View>
        <View style={styles.workflowCard}>
          <WorkflowStep icon="navigate-outline" label="Điều xe đi chợ" value="2/3 chuyến" percent={67} color={Colors.primary} />
          <WorkflowStep icon="download-outline" label="Nhận hàng" value="2/3 lô" percent={67} color={Colors.secondary} />
          <WorkflowStep icon="shield-checkmark-outline" label="Kiểm chất lượng" value="1/3 lô" percent={34} color={Colors.warning} />
          <WorkflowStep icon="layers-outline" label="Phân loại" value="1/3 đơn" percent={34} color={Colors.primary} />
          <WorkflowStep icon="car-outline" label="Bàn giao" value="0/2 tuyến" percent={0} color={Colors.tertiary} />
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Kế hoạch xe đi chợ</Text>
            <Text style={styles.sectionSubtitle}>42 đơn · 1.240 kg · 3 chợ đầu mối</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('MarketDispatch')}>
            <Text style={styles.seeAll}>Phân công xe</Text>
          </Pressable>
        </View>

        <Pressable style={styles.marketPlan} onPress={() => navigation.navigate('MarketDispatch')}>
          {MARKET_DISPATCHES.map((dispatch, index) => (
            <View key={dispatch.id} style={[styles.marketPlanRow, index > 0 && styles.marketPlanDivider]}>
              <View style={styles.marketPlanIcon}>
                <Ionicons name={dispatch.status === 'at_hub' ? 'checkmark' : dispatch.status === 'on_route' ? 'navigate' : 'time-outline'} size={17} color={Colors.primary} />
              </View>
              <View style={styles.marketPlanCopy}>
                <Text style={styles.marketPlanName}>{dispatch.shortName}</Text>
                <Text style={styles.marketPlanMeta}>{dispatch.orderCount} đơn · {dispatch.weightKg} kg · {dispatch.pickupWindow}</Text>
              </View>
              <View style={styles.marketPlanVehicle}>
                <Text style={styles.marketPlanPlate}>{dispatch.vehicle}</Text>
                <Text style={styles.marketPlanDriver} numberOfLines={1}>{dispatch.driver}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          ))}
        </Pressable>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Lô hàng đến hôm nay</Text>
            <Text style={styles.sectionSubtitle}>{HUB_BATCHES.length} lô · 1.240 kg dự kiến</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('HubTabs', { screen: 'InboundQueue' })}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </Pressable>
        </View>

        <View style={styles.batchList}>
          {HUB_BATCHES.map((batch) => {
            const status = BATCH_STATUS[batch.status];
            return (
              <Pressable key={batch.id} style={styles.batchCard} onPress={() => navigation.navigate('CheckIn', { batchId: batch.id })}>
                <View style={styles.batchIcon}><Ionicons name="cube-outline" size={21} color={Colors.primary} /></View>
                <View style={styles.batchCopy}>
                  <View style={styles.batchTitleRow}>
                    <Text style={styles.batchCode}>{batch.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.marketName}>{batch.marketName}</Text>
                  <Text style={styles.batchMeta}>{batch.arrivalTime} · {batch.totalKg} kg · {batch.products.length} mặt hàng</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quickActions}>
          <Pressable style={styles.primaryAction} onPress={() => navigation.navigate('CheckIn', { batchId: HUB_BATCHES[0].id })}>
            <Ionicons name="scan-outline" size={19} color={Colors.onPrimary} />
            <Text style={styles.primaryActionText}>Nhận lô hàng mới</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('IncidentReport')}>
            <Ionicons name="warning-outline" size={19} color="#8A5900" />
            <Text style={styles.secondaryActionText}>Báo sự cố</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, value, label, tone }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; tone: 'blue' | 'amber' | 'green' }) {
  const colors = tone === 'blue'
    ? { color: Colors.secondary, background: '#E8F4FC' }
    : tone === 'amber'
      ? { color: '#8A5900', background: Colors.warningLight }
      : { color: Colors.primary, background: Colors.successLight };
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.background }]}><Ionicons name={icon} size={19} color={colors.color} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function WorkflowStep({ icon, label, value, percent, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; percent: number; color: string }) {
  return (
    <View style={styles.workflowRow}>
      <View style={[styles.workflowIcon, { backgroundColor: `${color}14` }]}><Ionicons name={icon} size={18} color={color} /></View>
      <View style={styles.workflowBody}>
        <View style={styles.workflowLabels}><Text style={styles.workflowLabel}>{label}</Text><Text style={styles.workflowValue}>{value}</Text></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 30 },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  greeting: { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  userName: { color: Colors.onPrimary, fontSize: 21, fontWeight: '800', marginTop: 2 },
  hubName: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 4 },
  notificationButton: { width: 40, height: 40, flexShrink: 0, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.warning, borderWidth: 1, borderColor: Colors.primary },
  shiftCard: { marginTop: 16, borderRadius: 8, padding: 11, backgroundColor: 'rgba(255,255,255,0.13)', flexDirection: 'row', alignItems: 'center' },
  shiftIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.onPrimary, alignItems: 'center', justifyContent: 'center' },
  shiftCopy: { flex: 1, paddingHorizontal: 9 },
  shiftLabel: { color: Colors.onPrimary, fontSize: 10, fontWeight: '800' },
  shiftText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 3 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primaryFixed },
  onlineText: { color: Colors.onPrimary, fontSize: 9, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  metricCard: { flex: 1, minWidth: 0, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 10 },
  metricIcon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  metricLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  sectionHeading: { marginHorizontal: 16, marginTop: 21, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  progressPercent: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  workflowCard: { marginHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 13, gap: 13 },
  workflowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workflowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  workflowBody: { flex: 1 },
  workflowLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  workflowLabel: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  workflowValue: { fontSize: 10, color: Colors.textMuted },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.surfaceContainerHigh, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  seeAll: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  marketPlan: { marginHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, paddingHorizontal: 11 },
  marketPlanRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  marketPlanDivider: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant },
  marketPlanIcon: { width: 30, height: 30, borderRadius: 7, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  marketPlanCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  marketPlanName: { fontSize: 11, fontWeight: '800', color: Colors.textPrimary },
  marketPlanMeta: { fontSize: 8, color: Colors.textMuted, marginTop: 3 },
  marketPlanVehicle: { width: 86, minWidth: 0, alignItems: 'flex-end', paddingRight: 5 },
  marketPlanPlate: { fontSize: 9, fontWeight: '800', color: Colors.textPrimary },
  marketPlanDriver: { maxWidth: '100%', fontSize: 8, color: Colors.textMuted, marginTop: 3 },
  batchList: { marginHorizontal: 16, gap: 9 },
  batchCard: { minHeight: 72, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 11, flexDirection: 'row', alignItems: 'center' },
  batchIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  batchCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  batchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  batchCode: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statusText: { fontSize: 8, fontWeight: '800' },
  marketName: { fontSize: 10, color: Colors.textSecondary, marginTop: 3 },
  batchMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  quickActions: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 },
  primaryAction: { flex: 1, height: 44, borderRadius: 8, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryActionText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  secondaryAction: { height: 44, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: '#D9B967', backgroundColor: Colors.warningLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryActionText: { color: '#8A5900', fontSize: 11, fontWeight: '800' },
});
