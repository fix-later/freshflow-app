import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import {
  hubDispatchApi,
  type EligibleDriverDto,
  type HubDispatchPlanItem,
  type HubDispatchRouteStatus,
  type HubVehicleDto,
  type LoadingManifestDto,
} from '../api/hubDispatchApi';
import { useHubDispatch } from '../hooks/useHubDispatch';
import { useHubWork } from '../hooks/useHubWork';

type VehicleChoice = {
  vehicle: HubVehicleDto;
  eligible: boolean;
  fitsLoad: boolean;
  reasons: string[];
};

type Navigation = NativeStackNavigationProp<HubStackParamList>;

const STATUS: Record<HubDispatchRouteStatus, {
  label: string;
  color: string;
  background: string;
}> = {
  planned: { label: 'Chờ tối ưu', color: Colors.textMuted, background: Colors.surfaceContainerHigh },
  selected: { label: 'Chờ duyệt', color: '#8A5900', background: Colors.warningLight },
  reviewed: { label: 'Chờ phân xe', color: '#8A5900', background: Colors.warningLight },
  assigned: { label: 'Đã phân xe', color: Colors.primaryText, background: Colors.primaryLight },
  in_progress: { label: 'Đang giao', color: Colors.accent, background: Colors.secondaryContainer },
  completed: { label: 'Hoàn tất', color: Colors.primaryText, background: Colors.primaryLight },
  cancelled: { label: 'Đã huỷ', color: Colors.danger, background: Colors.dangerLight },
};

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  truck: 'Xe tải',
  van: 'Xe van',
  motorbike: 'Xe máy',
};

const REASON_LABEL: Record<string, string> = {
  VEHICLE_NOT_FOUND: 'Không tìm thấy xe',
  VEHICLE_INACTIVE: 'Xe đã ngừng hoạt động',
  VEHICLE_UNAVAILABLE: 'Xe đang không sẵn sàng',
  VEHICLE_DOUBLE_BOOKED: 'Xe đã được xếp cho tuyến khác hôm nay',
  VEHICLE_CAPACITY_EXCEEDED: 'Tuyến vượt giới hạn vận hành của xe',
  DRIVER_NOT_FOUND: 'Không tìm thấy tài xế',
  DRIVER_NOT_DRIVER_ROLE: 'Tài khoản không có vai trò tài xế',
  DRIVER_INACTIVE: 'Tài xế đã ngừng hoạt động',
  CHECK_FAILED: 'Không kiểm tra được trạng thái xe',
};

function formatServiceDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatDateRange(fromDate: string, toDate: string): string {
  if (!fromDate || !toDate) return '';
  return `${formatServiceDate(fromDate)} - ${formatServiceDate(toDate)}`;
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(value);
}

function shortRouteCode(value: string): string {
  return `RT-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

type ManifestLoadEstimate = {
  totalLoadKg: number;
  missingPackingLines: number;
};

/** Mirrors BE ShipmentEstimator semantics; tare is not exposed by loading-manifest. */
export function estimateManifestLoad(manifest: LoadingManifestDto): ManifestLoadEstimate {
  return manifest.stops.reduce<ManifestLoadEstimate>((routeTotal, stop) => (
    stop.lines.reduce<ManifestLoadEstimate>((stopTotal, line) => {
      if (!line.capacityKg || line.capacityKg <= 0) {
        return {
          ...stopTotal,
          missingPackingLines: stopTotal.missingPackingLines + 1,
        };
      }
      return {
        ...stopTotal,
        totalLoadKg: stopTotal.totalLoadKg
          + Math.ceil(line.quantity / line.capacityKg) * line.capacityKg,
      };
    }, routeTotal)
  ), { totalLoadKg: 0, missingPackingLines: 0 });
}

function countManifestOrders(manifest: LoadingManifestDto): number {
  return new Set(manifest.stops.flatMap((stop) => stop.lines.map((line) => line.orderId))).size;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return message || (error instanceof Error ? error.message : fallback);
}

export function MarketDispatchScreen() {
  const navigation = useNavigation<Navigation>();
  const { assignedHubs } = useHubWork();
  const { plan, loading, refreshing, error, refresh } = useHubDispatch(assignedHubs);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [vehicleChoices, setVehicleChoices] = useState<VehicleChoice[]>([]);
  const [checkingVehicles, setCheckingVehicles] = useState(false);
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);
  const [selectedVehicleChoice, setSelectedVehicleChoice] = useState<VehicleChoice | null>(null);
  const [eligibleDrivers, setEligibleDrivers] = useState<EligibleDriverDto[]>([]);

  const routes = (plan?.routes ?? []).filter((item) => item.manifest.stops.length > 0);
  const vehicles = plan?.vehicles ?? [];
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );
  const selectedPlan = routes.find(({ route }) => route.id === selectedRouteId) ?? null;
  const selectedLoadKg = selectedPlan ? estimateManifestLoad(selectedPlan.manifest).totalLoadKg : 0;
  const suggestedVehicleId = vehicleChoices.find((choice) => (
    choice.eligible && choice.fitsLoad && choice.vehicle.isAvailable
  ))?.vehicle.id ?? null;

  const summary = useMemo(() => ({
    routeCount: routes.length,
    orderCount: routes.reduce((sum, item) => sum + countManifestOrders(item.manifest), 0),
    waitingCount: routes.filter(({ route }) => route.status === 'reviewed' && !route.vehicleId).length,
    availableVehicleCount: vehicles.filter((vehicle) => vehicle.isAvailable).length,
  }), [routes, vehicles]);

  const openVehiclePicker = async (item: HubDispatchPlanItem) => {
    const routeMarketIds = new Set(item.route.stops.filter((stop) => stop.entityType === 'market').map((stop) => stop.entityId));
    const hubId = assignedHubs.find((hub) => hub.marketId && routeMarketIds.has(hub.marketId))?.hubId ?? null;
    if (!hubId) {
      Alert.alert('Không xác định được Hub', 'Tuyến không khớp với Hub được gán cho tài khoản này.');
      return;
    }
    setSelectedRouteId(item.route.id);
    setSelectedVehicleChoice(null);
    setVehicleChoices([]);
    setEligibleDrivers([]);
    setCheckingVehicles(true);
    const load = estimateManifestLoad(item.manifest);
    if (load.missingPackingLines > 0) {
      Alert.alert(
        'Chưa đủ dữ liệu tải trọng',
        `${load.missingPackingLines} dòng hàng chưa có capacityKg trong loading-manifest. App chưa thể chọn xe an toàn theo kg.`,
      );
      return;
    }
    const loadKg = load.totalLoadKg;

    try {
      const [choices, drivers] = await Promise.all([
        Promise.all(vehicles.map(async (vehicle): Promise<VehicleChoice> => {
        if (!vehicle.isAvailable) {
          return {
            vehicle,
            eligible: false,
            fitsLoad: loadKg === 0 || vehicle.capacityKg >= loadKg,
            reasons: ['VEHICLE_UNAVAILABLE'],
          };
        }

        try {
          const result = await hubDispatchApi.checkVehicle(item.route.id, vehicle.id);
          return {
            vehicle,
            eligible: result.isEligible,
            fitsLoad: loadKg === 0 || vehicle.capacityKg >= loadKg,
            reasons: result.reasons,
          };
        } catch {
          return {
            vehicle,
            eligible: false,
            fitsLoad: loadKg === 0 || vehicle.capacityKg >= loadKg,
            reasons: ['CHECK_FAILED'],
          };
        }
        })),
        hubDispatchApi.getEligibleDrivers(hubId),
      ]);

      setVehicleChoices(choices.sort((left, right) => {
        const leftScore = Number(left.eligible && left.fitsLoad && left.vehicle.isAvailable);
        const rightScore = Number(right.eligible && right.fitsLoad && right.vehicle.isAvailable);
        return rightScore - leftScore || left.vehicle.capacityKg - right.vehicle.capacityKg;
      }));
      setEligibleDrivers(drivers);
    } catch (loadError) {
      Alert.alert('Không thể tải dữ liệu điều phối', getErrorMessage(loadError, 'Vui lòng thử lại.'));
    } finally {
      setCheckingVehicles(false);
    }
  };

  const assignVehicle = async (choice: VehicleChoice, driver: EligibleDriverDto) => {
    if (!selectedRouteId || !choice.eligible || !choice.fitsLoad) return;
    setAssigningVehicleId(choice.vehicle.id);

    try {
      const latestEligibility = await hubDispatchApi.checkVehicle(
        selectedRouteId,
        choice.vehicle.id,
        driver.userId,
      );
      if (!latestEligibility.isEligible) {
        Alert.alert(
          'Xe không còn phù hợp',
          latestEligibility.reasons.map((reason) => REASON_LABEL[reason] ?? reason).join('\n'),
        );
        await openVehiclePicker(selectedPlan!);
        return;
      }

      await hubDispatchApi.assignVehicle(selectedRouteId, choice.vehicle.id, driver.userId);
      setSelectedRouteId(null);
      setSelectedVehicleChoice(null);
      await refresh();
      Alert.alert(
        'Phân xe thành công',
        `${choice.vehicle.plateNumber} đã được gán cho ${shortRouteCode(selectedRouteId)}.`,
      );
    } catch (assignError) {
      Alert.alert(
        'Không thể phân xe',
        getErrorMessage(assignError, 'Xe có thể vừa được gán cho tuyến khác. Vui lòng tải lại.'),
      );
    } finally {
      setAssigningVehicleId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        {loading && !plan ? (
          <Loading fullScreen label="Đang nhận kế hoạch giao hàng hôm nay..." />
        ) : error && !plan ? (
          <ErrorView fullScreen message={error} onRetry={refresh} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                colors={[Colors.primaryText]}
                tintColor={Colors.primaryText}
              />
            )}
          >
            <View style={styles.summaryBand}>
              <Text style={styles.eyebrow}>
                {formatDateRange(plan?.fromDate ?? '', plan?.toDate ?? '')}
              </Text>
              <Text style={styles.summaryTitle}>Kế hoạch phân xe trong 7 ngày</Text>
              <Text style={styles.summarySub}>
                Các đơn đã tới Hub được tự động tổng hợp theo tuyến giao nhà hàng.
              </Text>
              <View style={styles.summaryRow}>
                <Summary value={`${summary.routeCount}`} label="tuyến" />
                <Summary value={`${summary.orderCount}`} label="đơn/điểm giao" />
                <Summary value={`${summary.waitingCount}`} label="chờ phân xe" />
                <Summary value={`${summary.availableVehicleCount}`} label="xe sẵn sàng" />
              </View>
            </View>

            <View style={styles.notice}>
              <Ionicons name="sparkles-outline" size={20} color={Colors.primaryText} />
              <Text style={styles.noticeText}>
                App đề xuất xe nhỏ nhất đủ tải ước tính; BE kiểm tra lại trạng thái, trùng lịch và giới hạn tuyến trước khi gán.
              </Text>
            </View>

            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Tuyến giao nhà hàng</Text>
                <Text style={styles.sectionSub}>
                  {summary.waitingCount > 0
                    ? `${summary.waitingCount} tuyến đã duyệt đang chờ xe`
                    : 'Các tuyến trong 7 ngày đã được cập nhật'}
                </Text>
              </View>
              <Pressable accessibilityLabel="Tải lại kế hoạch phân xe" style={styles.refreshButton} onPress={refresh}>
                <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
              </Pressable>
            </View>

            {error ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
            {plan?.warnings?.map((warning) => (
              <View key={warning} style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{warning}</Text>
              </View>
            ))}

            {routes.length === 0 ? (
              <View style={styles.emptyCard}>
                <EmptyState
                  icon={<Ionicons name="checkmark-done-circle-outline" size={56} color={Colors.primaryText} />}
                  title="Chưa có tuyến giao trong 7 ngày"
                  subtitle="Đơn chỉ xuất hiện khi BE đã tạo tuyến và đơn đã tới Hub. Đơn mới xác nhận tại Restaurant chưa phải là task của Hub."
                  actionLabel="Kiểm tra lại"
                  onAction={refresh}
                />
              </View>
            ) : (
              <View style={styles.dispatchList}>
                {routes.map((item) => (
                  <DispatchCard
                    key={item.route.id}
                    item={item}
                    vehicle={item.route.vehicleId ? vehicleById.get(item.route.vehicleId) : undefined}
                    onAssign={() => void openVehiclePicker(item)}
                    onHandoff={() => {
                      const routeMarketIds = new Set(item.route.stops.filter((stop) => stop.entityType === 'market').map((stop) => stop.entityId));
                      const hubId = assignedHubs.find((hub) => hub.marketId && routeMarketIds.has(hub.marketId))?.hubId;
                      if (hubId) navigation.navigate('DriverHandoff', { routeId: item.route.id, hubId });
                    }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <VehiclePicker
        visible={Boolean(selectedRouteId) && !selectedVehicleChoice}
        routeCode={selectedRouteId ? shortRouteCode(selectedRouteId) : ''}
        loadKg={selectedLoadKg}
        choices={vehicleChoices}
        suggestedVehicleId={suggestedVehicleId}
        checking={checkingVehicles}
        assigningVehicleId={assigningVehicleId}
        onClose={() => !assigningVehicleId && setSelectedRouteId(null)}
        onSelect={setSelectedVehicleChoice}
      />
      <DriverPicker
        visible={Boolean(selectedRouteId && selectedVehicleChoice)}
        drivers={eligibleDrivers}
        assigning={Boolean(assigningVehicleId)}
        onBack={() => !assigningVehicleId && setSelectedVehicleChoice(null)}
        onSelect={(driver) => selectedVehicleChoice && void assignVehicle(selectedVehicleChoice, driver)}
      />
    </SafeAreaView>
  );
}

function DispatchCard({
  item,
  vehicle,
  onAssign,
  onHandoff,
}: {
  item: HubDispatchPlanItem;
  vehicle?: HubVehicleDto;
  onAssign: () => void;
  onHandoff: () => void;
}) {
  const { route, manifest } = item;
  const status = STATUS[route.status] ?? STATUS.planned;
  const load = estimateManifestLoad(manifest);
  const restaurantStops = route.stops.filter((stop) => stop.entityType === 'restaurant');
  const destinationNames = manifest.stops.length > 0
    ? manifest.stops.map((stop) => stop.restaurantName)
    : restaurantStops.map((stop) => stop.entityName);
  const assignable = route.status === 'reviewed' && !route.vehicleId;

  return (
    <View style={styles.dispatchCard}>
      <View style={styles.cardHeader}>
        <View style={styles.routeIcon}>
          <Ionicons name="navigate-outline" size={21} color={Colors.primaryText} />
        </View>
        <View style={styles.routeCopy}>
          <Text numeric style={styles.routeCode}>{shortRouteCode(route.id)}</Text>
          <Text style={styles.routeDate}>{formatServiceDate(route.serviceDate)}</Text>
          <Text numberOfLines={2} style={styles.destinations}>
            {destinationNames.length > 0 ? destinationNames.join(' · ') : 'Chưa có đơn tại Hub cho tuyến này'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.demandRow}>
        <Demand icon="receipt-outline" value={`${countManifestOrders(manifest)}`} label="đơn hàng" />
        <Demand
          icon="scale-outline"
          value={load.missingPackingLines > 0
            ? 'Thiếu quy cách'
            : load.totalLoadKg > 0 ? `${formatNumber(load.totalLoadKg)} kg` : 'Chưa có'}
          label="tải ước tính"
        />
        <Demand
          icon="navigate-circle-outline"
          value={route.totalDistanceKm === null ? 'Chưa tính' : `${formatNumber(route.totalDistanceKm)} km`}
          label="quãng đường"
        />
      </View>

      <View style={styles.assignmentRow}>
        <View style={styles.assignmentIcon}>
          <Ionicons name="car-outline" size={18} color={Colors.primaryText} />
        </View>
        <View style={styles.assignmentCopy}>
          <Text style={styles.assignmentLabel}>Phương tiện</Text>
          <Text numberOfLines={1} style={styles.assignmentValue}>
            {vehicle?.plateNumber ?? (route.vehicleId ? 'Xe đã được gán' : 'Chưa phân xe')}
          </Text>
          {vehicle ? (
            <Text style={styles.assignmentMeta}>
              {VEHICLE_TYPE_LABEL[vehicle.vehicleType] ?? vehicle.vehicleType} · {formatNumber(vehicle.capacityKg)} kg
            </Text>
          ) : null}
        </View>
        {assignable ? (
          <Pressable accessibilityLabel="Chọn xe cho tuyến" style={styles.assignButton} onPress={onAssign}>
            <Text style={styles.assignButtonText}>Chọn xe</Text>
            <Ionicons name="chevron-forward" size={15} color={Colors.primaryText} />
          </Pressable>
        ) : (
          <Ionicons
            name={route.vehicleId ? 'checkmark-circle-outline' : 'time-outline'}
            size={19}
            color={route.vehicleId ? Colors.primaryText : Colors.textMuted}
          />
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>
          {route.driverUserId ? 'Đã kèm tài xế' : 'Tài xế sẽ nhận tuyến sau khi được điều phối'}
        </Text>
        {route.estimatedDurationMinutes ? (
          <Text numeric style={styles.durationText}>~{route.estimatedDurationMinutes} phút</Text>
        ) : null}
      </View>
      {route.vehicleId && route.driverUserId && route.status === 'assigned' ? (
        <Pressable style={styles.assignButton} onPress={onHandoff}>
          <Text style={styles.assignButtonText}>Bàn giao cho tài xế</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.primaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

function VehiclePicker({
  visible,
  routeCode,
  loadKg,
  choices,
  suggestedVehicleId,
  checking,
  assigningVehicleId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  routeCode: string;
  loadKg: number;
  choices: VehicleChoice[];
  suggestedVehicleId: string | null;
  checking: boolean;
  assigningVehicleId: string | null;
  onClose: () => void;
  onSelect: (choice: VehicleChoice) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalTitle}>Chọn phương tiện</Text>
              <Text numberOfLines={1} style={styles.modalSub}>
                {routeCode} · tải ước tính {loadKg > 0 ? `${formatNumber(loadKg)} kg` : 'chưa có'}
              </Text>
            </View>
            <Pressable accessibilityLabel="Đóng" disabled={Boolean(assigningVehicleId)} style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={21} color={Colors.textPrimary} />
            </Pressable>
          </View>

          {checking ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.modalLoadingText}>Đang kiểm tra lịch và khả năng đáp ứng của xe...</Text>
            </View>
          ) : (
            <ScrollView style={styles.optionList} contentContainerStyle={styles.optionListContent} showsVerticalScrollIndicator={false}>
              {choices.length === 0 ? (
                <EmptyState
                  icon={<Ionicons name="car-outline" size={52} color={Colors.textMuted} />}
                  title="Không có xe hoạt động"
                  subtitle="Admin cần cập nhật đội xe trước khi Hub có thể phân công."
                />
              ) : choices.map((choice) => {
                const suggested = choice.vehicle.id === suggestedVehicleId;
                const selectable = choice.eligible && choice.fitsLoad && choice.vehicle.isAvailable;
                const assigning = assigningVehicleId === choice.vehicle.id;
                const reason = !choice.fitsLoad
                  ? 'Không đủ tải trọng ước tính'
                  : choice.reasons.map((item) => REASON_LABEL[item] ?? item).join(' · ');

                return (
                  <Pressable
                    key={choice.vehicle.id}
                    disabled={!selectable || Boolean(assigningVehicleId)}
                    style={[styles.optionRow, !selectable && styles.optionDisabled]}
                    onPress={() => onSelect(choice)}
                  >
                    <View style={styles.optionIcon}>
                      <Ionicons name="car-outline" size={20} color={selectable ? Colors.primaryText : Colors.textMuted} />
                    </View>
                    <View style={styles.optionCopy}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{choice.vehicle.plateNumber}</Text>
                        {suggested ? <Text style={styles.recommendedBadge}>ĐỀ XUẤT</Text> : null}
                      </View>
                      <Text style={styles.optionMeta}>
                        {VEHICLE_TYPE_LABEL[choice.vehicle.vehicleType] ?? choice.vehicle.vehicleType}
                        {' · '}{formatNumber(choice.vehicle.capacityKg)} kg
                      </Text>
                      {!selectable && reason ? <Text style={styles.optionReason}>{reason}</Text> : null}
                    </View>
                    {assigning ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons
                        name={selectable ? 'ellipse-outline' : 'close-circle-outline'}
                        size={22}
                        color={selectable ? Colors.outline : Colors.textMuted}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DriverPicker({
  visible,
  drivers,
  assigning,
  onBack,
  onSelect,
}: {
  visible: boolean;
  drivers: EligibleDriverDto[];
  assigning: boolean;
  onBack: () => void;
  onSelect: (driver: EligibleDriverDto) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onBack} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalTitle}>Chọn tài xế</Text>
              <Text style={styles.modalSub}>Tài xế sẽ được gán cùng phương tiện cho tuyến</Text>
            </View>
            <Pressable disabled={assigning} style={styles.closeButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={21} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.optionList} contentContainerStyle={styles.optionListContent}>
            {drivers.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="person-outline" size={52} color={Colors.textMuted} />}
                title="Không có tài xế đủ điều kiện"
                subtitle="BE chưa trả tài xế active có role driver."
              />
            ) : drivers.map((driver) => (
              <Pressable
                key={driver.userId}
                disabled={assigning}
                style={styles.optionRow}
                onPress={() => onSelect(driver)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="person-outline" size={20} color={Colors.primaryText} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>Tài xế {driver.userId.replaceAll('-', '').slice(0, 8).toUpperCase()}</Text>
                  <Text numeric style={styles.optionMeta}>{driver.userId}</Text>
                </View>
                {assigning ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={20} color={Colors.outline} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text numeric numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Demand({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.demandItem}>
      <Ionicons name={icon} size={17} color={Colors.primaryText} />
      <Text numeric numberOfLines={1} adjustsFontSizeToFit style={styles.demandValue}>{value}</Text>
      <Text style={styles.demandLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 30 },
  summaryBand: {
    backgroundColor: Colors.deepTeal,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  summaryTitle: { color: Colors.white, fontSize: 20, fontWeight: '800', marginTop: 5 },
  summarySub: { color: 'rgba(255,255,255,0.76)', fontSize: 11, lineHeight: 16, marginTop: 4 },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 13,
  },
  summaryItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  summaryValue: { color: Colors.white, fontSize: 14, fontWeight: '800', fontFamily: Fonts.monoBold, maxWidth: '100%' },
  summaryLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 8, marginTop: 3, textAlign: 'center' },
  notice: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noticeText: { flex: 1, color: Colors.textSecondary, fontSize: 10, lineHeight: 15 },
  sectionHeading: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  sectionSub: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineError: { marginHorizontal: 16, marginBottom: 10, borderRadius: 10, backgroundColor: Colors.dangerLight, padding: 10 },
  inlineErrorText: { color: Colors.danger, fontSize: 10, lineHeight: 15 },
  emptyCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  dispatchList: { marginHorizontal: 16, gap: 10 },
  dispatchCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    padding: 14,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  routeIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  routeCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  routeCode: { fontSize: 12, fontWeight: '800', fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  routeDate: { fontSize: 8, fontWeight: '700', color: Colors.primaryText, marginTop: 2 },
  destinations: { fontSize: 9, color: Colors.textMuted, lineHeight: 13, marginTop: 3 },
  statusBadge: { flexShrink: 0, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: '800' },
  demandRow: { flexDirection: 'row', marginTop: 13, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.outlineVariant },
  demandItem: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 2 },
  demandValue: { color: Colors.textPrimary, fontSize: 11, fontWeight: '800', fontFamily: Fonts.monoBold, marginTop: 4, maxWidth: '100%' },
  demandLabel: { color: Colors.textMuted, fontSize: 8, marginTop: 2, textAlign: 'center' },
  assignmentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingTop: 7 },
  assignmentIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  assignmentCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  assignmentLabel: { fontSize: 8, color: Colors.textMuted },
  assignmentValue: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  assignmentMeta: { fontSize: 8, color: Colors.textMuted, marginTop: 2 },
  assignButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 999, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight },
  assignButtonText: { color: Colors.primaryText, fontSize: 10, fontWeight: '800' },
  cardFooter: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant, paddingTop: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardFooterText: { flex: 1, fontSize: 8, color: Colors.textMuted },
  durationText: { fontSize: 8, fontFamily: Fonts.monoMedium, color: Colors.textSecondary },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  modalSheet: { height: '70%', maxHeight: 600, backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 18 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant, alignSelf: 'center', marginTop: 9 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  modalTitleCopy: { flex: 1, minWidth: 0 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  modalLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  modalLoadingText: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 17, marginTop: 12 },
  optionList: { flex: 1 },
  optionListContent: { paddingHorizontal: 16, paddingBottom: 8 },
  optionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  optionDisabled: { opacity: 0.52 },
  optionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionTitle: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  recommendedBadge: { fontSize: 7, fontWeight: '800', color: Colors.primaryText, backgroundColor: Colors.primaryLight, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  optionMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  optionReason: { fontSize: 8, color: Colors.danger, marginTop: 3 },
});
