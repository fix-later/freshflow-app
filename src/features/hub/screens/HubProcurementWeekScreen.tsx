import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import type { HubProcurementStatus } from '../api/hubApi';
import { useHubProcurementWeek } from '../hooks/useHubProcurementWeek';
import { useHubWork } from '../hooks/useHubWork';

const STATUS: Record<HubProcurementStatus, { label: string; color: string; background: string }> = {
  Built: { label: 'Đã tạo', color: Colors.textSecondary, background: Colors.surfaceContainerHigh },
  Manifested: { label: 'Chờ thu mua', color: '#8A5900', background: Colors.warningLight },
  Purchasing: { label: 'Đang thu mua', color: Colors.secondary, background: '#E8F4FC' },
  HandedOff: { label: 'Đã bàn giao', color: Colors.primaryText, background: Colors.primaryLight },
  Cancelled: { label: 'Đã hủy', color: Colors.error, background: '#FDECEC' },
};

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getVietnamDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shortCode(value: string): string {
  return `LO-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function HubProcurementWeekScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HubStackParamList>>();
  const hubWork = useHubWork();
  const week = useHubProcurementWeek(hubWork.assignedHubs);
  const today = getVietnamDate();
  const plansWithWork = week.plans.filter((plan) => (
    plan.date === today && plan.batches.length > 0
  ));
  const batchCount = plansWithWork.reduce((sum, plan) => sum + plan.batches.length, 0);
  const orderIds = new Set(
    plansWithWork.flatMap((plan) => plan.batches.flatMap((batch) => batch.orderIds)),
  );

  const refresh = async () => {
    await hubWork.refresh();
    await week.refresh();
  };

  if ((hubWork.loading || week.loading) && week.plans.length === 0) {
    return <Loading label="Đang tải kế hoạch hàng về Hub..." />;
  }

  if (hubWork.error && hubWork.assignedHubs.length === 0) {
    return <ErrorView message={hubWork.error} onRetry={hubWork.refresh} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={hubWork.refreshing || week.refreshing}
            onRefresh={refresh}
            colors={[Colors.primaryText]}
            tintColor={Colors.primary}
          />
        )}
      >
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primaryText} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Các lô dự kiến về Hub hôm nay</Text>
            <Text style={styles.summaryMeta} numeric>
              {batchCount} lô thu mua · {orderIds.size} đơn hàng
            </Text>
          </View>
        </View>

        {week.error ? <ErrorView message={week.error} onRetry={week.refresh} /> : null}

        {!week.error && hubWork.assignedHubs.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="business-outline" size={52} color={Colors.textMuted} />}
            title="Chưa được phân công Hub"
            subtitle="Kế hoạch sẽ xuất hiện sau khi bạn được quản lý phân công Hub."
          />
        ) : !week.error && plansWithWork.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="checkmark-done-circle-outline" size={52} color={Colors.primaryText} />}
            title="Chưa có kế hoạch thu mua"
            subtitle="Không có lô thu mua dự kiến về Hub trong ngày hôm nay."
          />
        ) : (
          <View style={styles.dayList}>
            {plansWithWork.map((plan) => (
              <View key={`${plan.hubId}-${plan.date}`} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayTitle}>{formatDate(plan.date)}</Text>
                    <Text style={styles.hubName}>{plan.hub.name}</Text>
                  </View>
                  <Text numeric style={styles.dayCount}>{plan.batches.length} lô</Text>
                </View>

                {plan.batches.map((batch) => {
                  const status = STATUS[batch.status] ?? STATUS.Built;
                  return (
                    <View key={batch.batchId} style={styles.batchCard}>
                      <View style={styles.batchHeader}>
                        <Text numeric style={styles.batchCode}>{shortCode(batch.batchId)}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </View>
                      </View>
                      <Text numeric style={styles.batchMeta}>
                        {batch.orderIds.length} đơn · {batch.items.length} mặt hàng
                      </Text>

                      <View style={styles.batchFacts}>
                        <View style={styles.fact}>
                          <Text style={styles.factLabel}>Đơn hàng</Text>
                          <Text numeric style={styles.factValue}>{batch.orderIds.length}</Text>
                        </View>
                        <View style={styles.factDivider} />
                        <View style={styles.fact}>
                          <Text style={styles.factLabel}>Mặt hàng</Text>
                          <Text numeric style={styles.factValue}>{batch.items.length}</Text>
                        </View>
                        <View style={styles.factDivider} />
                        <View style={styles.fact}>
                          <Text style={styles.factLabel}>Bàn giao lúc</Text>
                          <Text numeric style={styles.factValueSmall}>{formatDateTime(batch.handedOffAt)}</Text>
                        </View>
                      </View>

                      <Pressable
                        style={styles.detailButton}
                        onPress={() => navigation.navigate('HubBatchOrders', {
                          hubId: plan.hubId,
                          hubName: plan.hub.name,
                          date: plan.date,
                          batchId: batch.batchId,
                        })}
                      >
                        <Ionicons name="receipt-outline" size={17} color={Colors.primaryText} />
                        <Text style={styles.detailButtonText}>
                          Xem danh sách {batch.orderIds.length} đơn hàng
                        </Text>
                        <Ionicons name="arrow-forward" size={17} color={Colors.primaryText} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  summary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primaryLight,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1, paddingLeft: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  summaryMeta: { fontSize: 10, fontFamily: Fonts.monoMedium, color: Colors.textSecondary, marginTop: 4 },
  dayList: { gap: 18, marginTop: 20 },
  daySection: { gap: 9 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textTransform: 'capitalize' },
  hubName: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  dayCount: { fontSize: 10, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  batchCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 13,
  },
  batchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchCode: { fontSize: 12, fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: '800' },
  batchMeta: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textSecondary, marginTop: 9 },
  batchFacts: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 11,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    paddingVertical: 9,
  },
  fact: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  factDivider: { width: 1, backgroundColor: Colors.border },
  factLabel: { fontSize: 8, color: Colors.textMuted },
  factValue: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.textPrimary, marginTop: 3 },
  factValueSmall: {
    fontSize: 8,
    lineHeight: 11,
    fontFamily: Fonts.monoMedium,
    color: Colors.textPrimary,
    marginTop: 3,
    textAlign: 'center',
  },
  detailButton: {
    minHeight: 43,
    marginTop: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailButtonText: { flex: 1, fontSize: 10, fontWeight: '800', color: Colors.primaryText },
});
