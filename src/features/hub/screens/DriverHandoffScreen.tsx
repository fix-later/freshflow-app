import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import { buildOutboundItems, hubDispatchApi } from '../api/hubDispatchApi';
import { useHubDispatch } from '../hooks/useHubDispatch';
import { useHubWork } from '../hooks/useHubWork';

type Props = NativeStackScreenProps<HubStackParamList, 'DriverHandoff'>;

export function DriverHandoffScreen({ navigation, route: screenRoute }: Props) {
  const hubWork = useHubWork();
  const dispatch = useHubDispatch(hubWork.assignedHubs);
  const planItem = dispatch.plan?.routes.find(({ route }) => route.id === screenRoute.params.routeId);
  const orders = planItem?.manifest.stops.flatMap((stop) => {
    const grouped = new Map<string, { orderId: string; restaurant: string; lineCount: number }>();
    stop.lines.forEach((line) => {
      const current = grouped.get(line.orderId) ?? {
        orderId: line.orderId,
        restaurant: stop.restaurantName,
        lineCount: 0,
      };
      current.lineCount += 1;
      grouped.set(line.orderId, current);
    });
    return [...grouped.values()];
  }) ?? [];
  const [checkedOrders, setCheckedOrders] = useState(new Set<string>());
  const [confirmedByDriver, setConfirmedByDriver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set once recordOutbound succeeds, so a retry after createHandover fails (driver
  // reassigned, route status changed, ...) re-sends the *same* outbound event instead of
  // recording the dispatch — and decrementing hub stock — a second time.
  const [recordedOutboundEventId, setRecordedOutboundEventId] = useState<string | null>(null);
  const ready = orders.length > 0
    && orders.every((order) => checkedOrders.has(order.orderId))
    && confirmedByDriver
    && Boolean(planItem?.route.driverUserId);

  const toggleOrder = (orderId: string) => {
    setCheckedOrders((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const confirm = async () => {
    if (!planItem?.route.driverUserId || !ready) return;
    setSubmitting(true);
    try {
      // Records what's leaving the hub *before* the handover, so hub capacity/stock actually
      // frees up when a load departs instead of only ever growing (see buildOutboundItems' doc
      // comment). Skipped entirely — handover still proceeds with no outbound event — when no
      // line resolved to a market listing, since an empty dispatch is meaningless to record.
      // Reuses a prior success (see `recordedOutboundEventId`'s doc comment) instead of recording
      // the same dispatch twice on a retry.
      let outboundEventId = recordedOutboundEventId;
      if (!outboundEventId) {
        const { items: outboundItems, unmatchedProductNames } = buildOutboundItems(planItem.manifest);
        if (outboundItems.length > 0) {
          const outbound = await hubDispatchApi.recordOutbound(
            screenRoute.params.hubId,
            planItem.route.id,
            outboundItems,
            new Date().toISOString(),
          );
          outboundEventId = outbound.outboundId;
          setRecordedOutboundEventId(outbound.outboundId);
        }
        if (unmatchedProductNames.length > 0) {
          console.warn(
            `Xuất kho bỏ qua ${unmatchedProductNames.length} sản phẩm không xác định được marketProductId: ${unmatchedProductNames.join(', ')}`,
          );
        }
      }

      await hubDispatchApi.createHandover(
        screenRoute.params.hubId,
        planItem.route.id,
        planItem.route.driverUserId,
        outboundEventId,
        `Hub Staff xác nhận đủ ${orders.length} đơn trên App`,
      );
      Alert.alert('Bàn giao thành công', 'Tuyến đã được bàn giao cho tài xế được phân công.', [
        { text: 'Về tổng quan', onPress: () => navigation.navigate('HubTabs', { screen: 'HubDashboard' }) },
      ]);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Không thể bàn giao', message ?? 'Vui lòng kiểm tra trạng thái tuyến và tài xế rồi thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (dispatch.loading && !dispatch.plan) return <Loading fullScreen label="Đang tải manifest bàn giao..." />;
  if (dispatch.error && !dispatch.plan) return <ErrorView fullScreen message={dispatch.error} onRetry={dispatch.refresh} />;
  if (!planItem) return <EmptyState title="Không tìm thấy tuyến" subtitle="Tuyến có thể nằm ngoài cửa sổ giao hàng 7 ngày hoặc đã bị huỷ." />;

  const routeCode = `RT-${planItem.route.id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  const totalKg = planItem.manifest.stops.reduce((sum, stop) => sum + stop.lines.reduce((lineSum, line) => (
    lineSum + (line.capacityKg && line.capacityKg > 0
      ? Math.ceil(line.quantity / line.capacityKg) * line.capacityKg
      : line.quantity)
  ), 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.routeCard}>
            <View style={styles.routeTop}>
              <View style={styles.routeCopy}>
                <Text style={styles.routeLabel}>TUYẾN GIAO</Text>
                <Text numeric style={styles.routeCode}>{routeCode}</Text>
                <Text numberOfLines={2} style={styles.routeZone}>{planItem.manifest.stops.map((stop) => stop.restaurantName).join(' · ')}</Text>
              </View>
              <View style={styles.readyBadge}><Ionicons name="checkmark-circle" size={15} color={Colors.onPrimary} /><Text style={styles.readyText}>Đã phân xe</Text></View>
            </View>
            <View style={styles.routeStats}>
              <Stat value={`${planItem.manifest.stops.length}`} label="điểm giao" />
              <Stat value={`${totalKg} kg`} label="khối lượng" />
              <Stat value={`${orders.length}`} label="đơn hàng" />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Tài xế được phân công</Text>
          <View style={styles.driverCard}>
            <View style={styles.avatar}><Ionicons name="person" size={20} color={Colors.primaryText} /></View>
            <View style={styles.driverCopy}>
              <Text style={styles.driverName}>Tài xế FreshFlow</Text>
              <Text numeric style={styles.driverMeta}>{planItem.route.driverUserId ?? 'Chưa có driverUserId'}</Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitleNoMargin}>Kiểm tra từng đơn hàng</Text><Text numeric style={styles.sectionSubtitle}>{checkedOrders.size}/{orders.length} đơn đã xác nhận</Text></View>
            <Ionicons name="cube-outline" size={20} color={Colors.primaryText} />
          </View>
          <View style={styles.packageList}>
            {orders.map((item) => {
              const checked = checkedOrders.has(item.orderId);
              return (
                <Pressable key={item.orderId} style={[styles.packageCard, checked && styles.packageCardChecked]} onPress={() => toggleOrder(item.orderId)}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked ? <Ionicons name="checkmark" size={16} color={Colors.onPrimary} /> : null}</View>
                  <View style={styles.packageCopy}>
                    <Text numeric style={styles.packageCode}>ĐH-{item.orderId.replaceAll('-', '').slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.packageRestaurant}>{item.restaurant}</Text>
                  </View>
                  <Text numeric style={styles.packageCount}>{item.lineCount} mặt hàng</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Xác nhận của tài xế</Text>
          <Pressable style={[styles.signaturePad, confirmedByDriver && styles.signaturePadSigned]} onPress={() => setConfirmedByDriver((value) => !value)}>
            <Ionicons name={confirmedByDriver ? 'checkmark-circle' : 'create-outline'} size={28} color={Colors.primaryText} />
            <Text style={styles.signatureTitle}>{confirmedByDriver ? 'Tài xế đã xác nhận đủ hàng' : 'Chạm khi tài xế đã kiểm đủ đơn'}</Text>
            <Text style={styles.signatureHint}>Xác nhận trực tiếp trước khi tạo biên bản bàn giao</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled={!ready || submitting} style={[styles.confirmButton, (!ready || submitting) && styles.confirmButtonDisabled]} onPress={() => void confirm()}>
            <Text style={[styles.confirmText, (!ready || submitting) && styles.confirmTextDisabled]}>{submitting ? 'Đang bàn giao...' : 'Xác nhận bàn giao'}</Text>
            <Ionicons name="checkmark-done" size={19} color={ready && !submitting ? Colors.onPrimary : Colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text numeric style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceContainerLowest },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 24 },
  routeCard: { borderRadius: 16, backgroundColor: Colors.deepTeal, padding: 16 },
  routeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  routeCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  routeLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  routeCode: { fontSize: 18, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.white, marginTop: 3 },
  routeZone: { fontSize: 10, lineHeight: 15, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: Colors.primary },
  readyText: { fontSize: 8, fontWeight: '800', color: Colors.onPrimary },
  routeStats: { flexDirection: 'row', marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 12, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.white },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.66)', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginTop: 19, marginBottom: 9 },
  sectionTitleNoMargin: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 9 },
  sectionSubtitle: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  driverCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 12, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  driverCopy: { flex: 1, paddingHorizontal: 10 },
  driverName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  driverMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  packageList: { gap: 8 },
  packageCard: { minHeight: 60, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 12, flexDirection: 'row', alignItems: 'center' },
  packageCardChecked: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  checkbox: { width: 25, height: 25, borderRadius: 6, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  packageCopy: { flex: 1, paddingHorizontal: 9 },
  packageCode: { fontSize: 11, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  packageRestaurant: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  packageCount: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary },
  signaturePad: { minHeight: 126, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary600, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', padding: 16 },
  signaturePadSigned: { borderStyle: 'solid', backgroundColor: Colors.surface },
  signatureTitle: { fontSize: 11, fontWeight: '800', color: Colors.primaryText, marginTop: 7, textAlign: 'center' },
  signatureHint: { fontSize: 9, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, padding: 10 },
  confirmButton: { height: 48, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  confirmButtonDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  confirmText: { fontSize: 11, fontWeight: '800', color: Colors.onPrimary },
  confirmTextDisabled: { color: Colors.textMuted },
});
