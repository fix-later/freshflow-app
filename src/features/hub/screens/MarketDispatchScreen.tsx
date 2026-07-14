import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RestaurantText as Text } from '../../restaurant/components/RestaurantText';
import { RestaurantColors as Colors, RestaurantFonts } from '../../restaurant/theme';
import {
  MARKET_DISPATCHES,
  MARKET_DRIVERS,
  MARKET_VEHICLES,
  type MarketDispatch,
} from '../data/hubOperations';

type SelectionTarget = {
  dispatchId: string;
  kind: 'vehicle' | 'driver';
} | null;

const STATUS = {
  ready: { label: 'Chờ xuất phát', color: '#8A5900', background: Colors.warningLight },
  on_route: { label: 'Đang đi chợ', color: Colors.accent, background: Colors.secondaryContainer },
  at_hub: { label: 'Đã về Hub', color: Colors.primaryText, background: Colors.primaryLight },
} as const;

export function MarketDispatchScreen() {
  const [dispatches, setDispatches] = useState(MARKET_DISPATCHES);
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>(null);

  const summary = useMemo(() => ({
    orderCount: dispatches.reduce((sum, item) => sum + item.orderCount, 0),
    totalKg: dispatches.reduce((sum, item) => sum + item.weightKg, 0),
    assignedCount: dispatches.filter((item) => item.vehicle && item.driver).length,
  }), [dispatches]);

  const selectVehicle = (dispatchId: string, plate: string, capacityKg: number) => {
    setDispatches((current) => current.map((item) => item.id === dispatchId
      ? { ...item, vehicle: plate, fillRate: Math.min(100, Math.round((item.weightKg / capacityKg) * 100)) }
      : item));
    setSelectionTarget(null);
  };

  const selectDriver = (dispatchId: string, driver: string) => {
    setDispatches((current) => current.map((item) => item.id === dispatchId ? { ...item, driver } : item));
    setSelectionTarget(null);
  };

  const confirmPlan = () => {
    Alert.alert(
      'Đã xác nhận kế hoạch',
      `${summary.assignedCount}/${dispatches.length} chuyến đã có đủ xe và tài xế.`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryBand}>
            <Text style={styles.eyebrow}>CA SÁNG · 13/07/2026</Text>
            <Text style={styles.summaryTitle}>Kế hoạch lấy hàng hôm nay</Text>
            <Text style={styles.summarySub}>Tổng hợp nhu cầu nhà hàng trước khi xe xuất phát đến chợ.</Text>
            <View style={styles.summaryRow}>
              <Summary value={`${dispatches.length}`} label="chợ" />
              <Summary value={`${summary.orderCount}`} label="đơn hàng" />
              <Summary value={`${summary.totalKg.toLocaleString('vi-VN')} kg`} label="cần lấy" />
              <Summary value="4/5" label="xe sẵn sàng" />
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primaryText} />
            <Text style={styles.noticeText}>Ưu tiên xe có tải trọng phù hợp và đủ thời gian quay về Hub trước 07:30.</Text>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Phân công theo chợ</Text>
              <Text style={styles.sectionSub}>{summary.assignedCount}/{dispatches.length} chuyến đã đủ xe và tài xế</Text>
            </View>
            <View style={styles.assignedBadge}><Text numeric style={styles.assignedBadgeText}>{summary.assignedCount}/{dispatches.length}</Text></View>
          </View>

          <View style={styles.dispatchList}>
            {dispatches.map((dispatch) => (
              <DispatchCard
                key={dispatch.id}
                dispatch={dispatch}
                onChangeVehicle={() => setSelectionTarget({ dispatchId: dispatch.id, kind: 'vehicle' })}
                onChangeDriver={() => setSelectionTarget({ dispatchId: dispatch.id, kind: 'driver' })}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerCopy}>
            <Text style={styles.footerLabel}>Tổng tải dự kiến</Text>
            <Text numeric style={styles.footerValue}>{summary.totalKg.toLocaleString('vi-VN')} kg</Text>
          </View>
          <Pressable style={styles.confirmButton} onPress={confirmPlan}>
            <Text style={styles.confirmButtonText}>Xác nhận kế hoạch</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </View>

      <AssignmentModal
        target={selectionTarget}
        dispatches={dispatches}
        onClose={() => setSelectionTarget(null)}
        onSelectVehicle={selectVehicle}
        onSelectDriver={selectDriver}
      />
    </SafeAreaView>
  );
}

function DispatchCard({ dispatch, onChangeVehicle, onChangeDriver }: {
  dispatch: MarketDispatch;
  onChangeVehicle: () => void;
  onChangeDriver: () => void;
}) {
  const status = STATUS[dispatch.status];
  const editable = dispatch.status === 'ready';

  return (
    <View style={styles.dispatchCard}>
      <View style={styles.cardHeader}>
        <View style={styles.marketIcon}><Ionicons name="storefront-outline" size={21} color={Colors.primaryText} /></View>
        <View style={styles.marketCopy}>
          <Text style={styles.marketName}>{dispatch.marketName}</Text>
          <Text style={styles.pickupWindow}>Lấy hàng {dispatch.pickupWindow}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.demandRow}>
        <Demand icon="receipt-outline" value={`${dispatch.orderCount}`} label="đơn" />
        <Demand icon="scale-outline" value={`${dispatch.weightKg} kg`} label="cần lấy" />
        <Demand icon="navigate-outline" value={`${dispatch.distanceKm} km`} label="từ Hub" />
      </View>

      <View style={styles.assignmentSection}>
        <AssignmentRow
          icon="car-outline"
          label="Phương tiện"
          value={dispatch.vehicle}
          editable={editable}
          onPress={onChangeVehicle}
        />
        <View style={styles.divider} />
        <AssignmentRow
          icon="person-outline"
          label="Tài xế"
          value={dispatch.driver}
          editable={editable}
          onPress={onChangeDriver}
        />
      </View>

      <View style={styles.loadHeader}>
        <Text style={styles.loadLabel}>Mức sử dụng tải trọng</Text>
        <Text numeric style={styles.loadValue}>{dispatch.fillRate}%</Text>
      </View>
      <View style={styles.loadTrack}>
        <View style={[styles.loadFill, { width: `${dispatch.fillRate}%` }]} />
      </View>
    </View>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return <View style={styles.summaryItem}><Text numeric numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function Demand({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return <View style={styles.demandItem}><Ionicons name={icon} size={17} color={Colors.primaryText} /><Text numeric style={styles.demandValue}>{value}</Text><Text style={styles.demandLabel}>{label}</Text></View>;
}

function AssignmentRow({ icon, label, value, editable, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editable: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.assignmentRow}>
      <View style={styles.assignmentIcon}><Ionicons name={icon} size={18} color={Colors.primaryText} /></View>
      <View style={styles.assignmentCopy}><Text style={styles.assignmentLabel}>{label}</Text><Text numberOfLines={1} style={styles.assignmentValue}>{value}</Text></View>
      {editable ? (
        <Pressable accessibilityLabel={`Đổi ${label.toLowerCase()}`} style={styles.changeButton} onPress={onPress}>
          <Text style={styles.changeText}>Đổi</Text><Ionicons name="chevron-forward" size={15} color={Colors.primaryText} />
        </Pressable>
      ) : <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />}
    </View>
  );
}

function AssignmentModal({ target, dispatches, onClose, onSelectVehicle, onSelectDriver }: {
  target: SelectionTarget;
  dispatches: MarketDispatch[];
  onClose: () => void;
  onSelectVehicle: (dispatchId: string, plate: string, capacityKg: number) => void;
  onSelectDriver: (dispatchId: string, driver: string) => void;
}) {
  const dispatch = target ? dispatches.find((item) => item.id === target.dispatchId) : undefined;
  const isVehicle = target?.kind === 'vehicle';

  return (
    <Modal visible={Boolean(target)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalTitle}>{isVehicle ? 'Chọn phương tiện' : 'Chọn tài xế'}</Text>
              <Text numberOfLines={1} style={styles.modalSub}>{dispatch?.marketName}</Text>
            </View>
            <Pressable accessibilityLabel="Đóng" style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={21} color={Colors.textPrimary} /></Pressable>
          </View>

          <ScrollView style={styles.optionList} contentContainerStyle={styles.optionListContent} showsVerticalScrollIndicator={false}>
            {target && isVehicle && MARKET_VEHICLES.map((vehicle) => {
              const selected = vehicle.plate === dispatch?.vehicle;
              return (
                <Pressable
                  key={vehicle.id}
                  disabled={!vehicle.available}
                  style={[styles.optionRow, !vehicle.available && styles.optionDisabled]}
                  onPress={() => onSelectVehicle(target.dispatchId, vehicle.plate, vehicle.capacityKg)}
                >
                  <View style={styles.optionIcon}><Ionicons name="car-outline" size={20} color={vehicle.available ? Colors.primaryText : Colors.textMuted} /></View>
                  <View style={styles.optionCopy}><Text style={styles.optionTitle}>{vehicle.plate}</Text><Text style={styles.optionMeta}>{vehicle.type} · {vehicle.capacityKg} kg</Text></View>
                  {!vehicle.available ? <Text style={styles.unavailableText}>Bảo trì</Text> : selected ? <Ionicons name="checkmark-circle" size={22} color={Colors.primaryText} /> : <Ionicons name="ellipse-outline" size={22} color={Colors.outline} />}
                </Pressable>
              );
            })}

            {target && !isVehicle && MARKET_DRIVERS.map((driver) => {
              const selected = driver.name === dispatch?.driver;
              return (
                <Pressable key={driver.id} style={styles.optionRow} onPress={() => onSelectDriver(target.dispatchId, driver.name)}>
                  <View style={styles.optionIcon}><Ionicons name="person-outline" size={20} color={Colors.primaryText} /></View>
                  <View style={styles.optionCopy}><Text style={styles.optionTitle}>{driver.name}</Text><Text style={styles.optionMeta}>{driver.phone} · Sẵn sàng</Text></View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={Colors.primaryText} /> : <Ionicons name="ellipse-outline" size={22} color={Colors.outline} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 24 },
  summaryBand: { backgroundColor: Colors.deepTeal, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  summaryTitle: { color: Colors.white, fontSize: 20, fontWeight: '800', marginTop: 5 },
  summarySub: { color: 'rgba(255,255,255,0.76)', fontSize: 11, lineHeight: 16, marginTop: 4 },
  summaryRow: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 13 },
  summaryItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  summaryValue: { color: Colors.white, fontSize: 14, fontWeight: '800', fontFamily: RestaurantFonts.monoBold, maxWidth: '100%' },
  summaryLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 8, marginTop: 3 },
  notice: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: Colors.primaryLight, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noticeText: { flex: 1, color: Colors.textSecondary, fontSize: 10, lineHeight: 15 },
  sectionHeading: { marginHorizontal: 16, marginTop: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  sectionSub: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  assignedBadge: { minWidth: 38, height: 30, borderRadius: 999, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  assignedBadgeText: { color: Colors.primaryText, fontSize: 11, fontWeight: '800', fontFamily: RestaurantFonts.monoBold },
  dispatchList: { marginHorizontal: 16, gap: 10 },
  dispatchCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, backgroundColor: Colors.surface, padding: 14, shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  marketIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  marketCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  marketName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  pickupWindow: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  statusBadge: { flexShrink: 0, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: '800' },
  demandRow: { flexDirection: 'row', marginTop: 13, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.outlineVariant },
  demandItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  demandValue: { color: Colors.textPrimary, fontSize: 11, fontWeight: '800', fontFamily: RestaurantFonts.monoBold, marginTop: 4 },
  demandLabel: { color: Colors.textMuted, fontSize: 8, marginTop: 2 },
  assignmentSection: { paddingTop: 4 },
  assignmentRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  assignmentIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  assignmentCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  assignmentLabel: { fontSize: 8, color: Colors.textMuted },
  assignmentValue: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  changeButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight },
  changeText: { color: Colors.primaryText, fontSize: 10, fontWeight: '800' },
  divider: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 39 },
  loadHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  loadLabel: { fontSize: 9, color: Colors.textMuted },
  loadValue: { fontSize: 10, fontWeight: '800', fontFamily: RestaurantFonts.monoBold, color: Colors.primaryText },
  loadTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.surfaceContainerHigh, overflow: 'hidden', marginTop: 6 },
  loadFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  footer: { minHeight: 70, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerCopy: { flexShrink: 0 },
  footerLabel: { fontSize: 8, color: Colors.textMuted },
  footerValue: { fontSize: 15, fontWeight: '800', fontFamily: RestaurantFonts.monoBold, color: Colors.textPrimary, marginTop: 2 },
  confirmButton: { flex: 1, minWidth: 0, height: 48, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  confirmButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  modalSheet: { height: '65%', maxHeight: 520, backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 18 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant, alignSelf: 'center', marginTop: 9 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  modalTitleCopy: { flex: 1, minWidth: 0 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  optionList: { flex: 1 },
  optionListContent: { paddingHorizontal: 16, paddingBottom: 8 },
  optionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  optionDisabled: { opacity: 0.48 },
  optionIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  optionTitle: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  optionMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  unavailableText: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
});
