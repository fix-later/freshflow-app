import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { Text, TextInput } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import {
  hubApi,
  isInboundReceived,
  type HubDiscrepancyCondition,
  type HubInboundTask,
  type HubProcurementBatchDto,
} from '../api/hubApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import {
  formatQuantityWithUnit,
  getQuantityUnit,
} from '../../../utils/quantity';

type Navigation = NativeStackNavigationProp<HubStackParamList, 'CheckIn'>;

type Props = {
  task: HubInboundTask;
  navigation: Navigation;
};

type ReviewStatus = 'PENDING' | 'OK' | 'MISSING' | 'DAMAGED' | 'WRONG_ITEM' | 'PARTIAL';

type ItemReview = {
  status: ReviewStatus;
  affectedQuantity: string;
  notes: string;
  persisted?: boolean;
  serverStatus?: string;
};

type OrderLine = {
  orderId: string;
  orderItemId: string;
  restaurantName: string;
  marketProductId: string;
  productName: string;
  quantity: number;
  unit: string | null;
};

const REVIEW_OPTIONS: Array<{
  id: Exclude<ReviewStatus, 'PENDING'>;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'OK', label: 'Đủ & đúng', icon: 'checkmark-circle-outline' },
  { id: 'MISSING', label: 'Thiếu', icon: 'remove-circle-outline' },
  { id: 'DAMAGED', label: 'Hỏng', icon: 'warning-outline' },
  { id: 'WRONG_ITEM', label: 'Sai hàng', icon: 'swap-horizontal-outline' },
  { id: 'PARTIAL', label: 'Nhận một phần', icon: 'pie-chart-outline' },
];

const ISSUE_LABEL: Record<Exclude<ReviewStatus, 'PENDING' | 'OK'>, string> = {
  MISSING: 'Thiếu hàng',
  DAMAGED: 'Hàng hư hỏng',
  WRONG_ITEM: 'Sai mặt hàng',
  PARTIAL: 'Chỉ nhận một phần',
};

function shortCode(prefix: string, value: string | null): string {
  if (!value) return 'Chưa có mã';
  return `${prefix}-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function readQuantity(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Không thể lưu kết quả kiểm đếm. Vui lòng thử lại.');
}

function toBackendCondition(status: ReviewStatus): HubDiscrepancyCondition {
  if (status === 'DAMAGED') return 'DAMAGED';
  if (status === 'PARTIAL') return 'PARTIAL';
  // BE supports MISSING/DAMAGED/PARTIAL. A wrong item means the ordered item is missing;
  // the explicit WRONG_ITEM marker in notes preserves the operational reason.
  return 'MISSING';
}

function getOrderLines(batch: HubProcurementBatchDto | null): OrderLine[] {
  return batch?.orders?.flatMap((order) => order.items.map((item) => ({
    orderId: order.orderId,
    orderItemId: item.orderItemId,
    restaurantName: order.restaurantName,
    marketProductId: item.marketProductId ?? '',
    productName: item.productName,
    quantity: item.quantity,
    unit: item.unit,
  }))) ?? [];
}

function buildInitialReviews(lines: OrderLine[], completed: boolean): Record<string, ItemReview> {
  return Object.fromEntries(lines.map((line) => [line.orderItemId, {
    status: completed ? 'OK' : 'PENDING',
    affectedQuantity: '',
    notes: '',
  }]));
}

export function AssignedInboundTaskScreen({ task, navigation }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const productListOffsetY = useRef(0);
  const orderGroupOffsets = useRef<Record<string, number>>({});
  const productCardOffsets = useRef<Record<string, number>>({});
  const readOnly = isInboundReceived(task.status);
  const [submitting, setSubmitting] = useState(false);
  const [received, setReceived] = useState(isInboundReceived(task.status));
  const [reviews, setReviews] = useState<Record<string, ItemReview>>({});
  const [batch, setBatch] = useState<HubProcurementBatchDto | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(Boolean(task.deliveryScheduleId));
  const [batchError, setBatchError] = useState<string | null>(null);

  const loadBatch = async () => {
    if (!task.deliveryScheduleId) {
      setLoadingBatch(false);
      setBatchError('Lô nhận chưa liên kết với batch đơn hàng nên chưa thể gửi discrepancy.');
      return;
    }
    setLoadingBatch(true);
    setBatchError(null);
    try {
      const detail = await hubApi.getInboundBatchDetail(task);
      setBatch(detail);
      if (!detail) {
        setBatchError('Không tìm thấy chi tiết đơn hàng của lô này trong kế hoạch Hub.');
      } else if ((detail.orders?.length ?? 0) !== detail.orderIds.length) {
        setBatchError(
          `API chưa trả đủ chi tiết đơn nhà hàng (${detail.orders?.length ?? 0}/${detail.orderIds.length} đơn). Không thể kiểm đếm bằng số lượng gộp.`,
        );
      }

      const saved = (await hubApi.getDiscrepancies(task.hubId))
        .filter((item) => item.inboundEventId === task.inboundId);
      const lines = getOrderLines(detail);
      const lineIds = new Set(lines.map((line) => line.orderItemId));
      const next = buildInitialReviews(lines, isInboundReceived(task.status));
      saved.forEach((discrepancy) => {
        if (!lineIds.has(discrepancy.orderItemId)) return;
        const marker = discrepancy.notes?.match(/\[APP:([^:\]]+):([A-Z_]+)\]/);
        const markerStatus = marker?.[2];
        const status: ReviewStatus = markerStatus === 'WRONG_ITEM'
          ? 'WRONG_ITEM'
          : discrepancy.conditionStatus;
        const current = next[discrepancy.orderItemId];
        let notes = discrepancy.notes?.replace(marker?.[0] ?? '', '').trim() ?? '';
        const labelPrefix = `${ISSUE_LABEL[status as keyof typeof ISSUE_LABEL] ?? ''}.`;
        if (labelPrefix !== '.' && notes.startsWith(labelPrefix)) {
          notes = notes.slice(labelPrefix.length).trim();
        }
        next[discrepancy.orderItemId] = {
          status,
          affectedQuantity: String(readQuantity(current?.affectedQuantity ?? '')
            + discrepancy.affectedQuantity),
          notes: current?.notes || notes,
          persisted: true,
          serverStatus: current?.serverStatus === 'OPEN' || discrepancy.status === 'OPEN'
            ? 'OPEN'
            : 'ACKNOWLEDGED',
        };
      });
      setReviews(next);
    } catch (error) {
      setBatchError(getErrorMessage(error));
    } finally {
      setLoadingBatch(false);
    }
  };

  useEffect(() => {
    void loadBatch();
    // The route owns a stable task snapshot; reload is exposed explicitly in the notice below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.inboundId]);

  const orders = batch?.orders ?? [];
  const orderLines = useMemo(() => getOrderLines(batch), [batch]);
  const checkedCount = orderLines.filter((line) => (
    Boolean(reviews[line.orderItemId]?.status)
    && reviews[line.orderItemId]?.status !== 'PENDING'
  )).length;
  const issueItems = orderLines.filter((line) => {
    const status = reviews[line.orderItemId]?.status;
    return Boolean(status && status !== 'PENDING' && status !== 'OK');
  });
  const allChecked = orderLines.length > 0 && checkedCount === orderLines.length;

  const issueValidationError = issueItems.reduce<string | null>((error, line) => {
    if (error) return error;
    const review = reviews[line.orderItemId];
    if (!review) return null;
    if (review.persisted) return null;
    const affected = readQuantity(review.affectedQuantity);
    if (affected <= 0) return `Nhập số lượng ảnh hưởng cho ${line.productName}.`;
    if (review.notes.trim().length < 3) return `Mô tả ngắn tình trạng của ${line.productName}.`;
    if (affected > line.quantity) {
      return `Số lượng ảnh hưởng của ${line.productName} vượt quá ${formatQuantityWithUnit(line.quantity, line.unit)} trong đơn ${shortCode('ĐH', line.orderId)}.`;
    }
    return null;
  }, null);
  const submitDisabled = !readOnly && (
    submitting || loadingBatch || !allChecked || Boolean(batchError) || Boolean(issueValidationError)
  );

  const updateReview = (orderItemId: string, patch: Partial<ItemReview>) => {
    if (readOnly) return;
    setReviews((current) => ({
      ...current,
      [orderItemId]: { ...current[orderItemId], ...patch },
    }));
  };

  const selectStatus = (orderItemId: string, status: Exclude<ReviewStatus, 'PENDING'>) => {
    if (readOnly || reviews[orderItemId]?.persisted) return;
    updateReview(orderItemId, status === 'OK'
      ? { status, affectedQuantity: '', notes: '' }
      : { status });
  };

  const scrollToIssueField = (orderItemId: string, fieldOffset: number) => {
    const cardOffset = productCardOffsets.current[orderItemId] ?? 0;
    // Wait until the keyboard has resized the viewport, then place the active field
    // comfortably above both the keyboard and the fixed action footer.
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, productListOffsetY.current + cardOffset + fieldOffset),
        animated: true,
      });
    }, Platform.OS === 'ios' ? 320 : 220);
  };

  const submit = async () => {
    if (readOnly) {
      navigation.goBack();
      return;
    }
    if (!allChecked) {
      Alert.alert('Chưa kiểm đủ đơn hàng', 'Hãy chọn kết quả cho từng dòng hàng trong từng đơn nhà hàng trước khi hoàn tất.');
      return;
    }
    if (issueValidationError) {
      Alert.alert('Chưa đủ thông tin discrepancy', issueValidationError);
      return;
    }
    const newIssueItems = issueItems.filter((line) => !reviews[line.orderItemId]?.persisted);
    if (received && newIssueItems.length === 0) {
      navigation.goBack();
      return;
    }

    setSubmitting(true);
    try {
      if (!received) {
        await hubApi.confirmInbound(task.inboundId);
        setReceived(true);
      }

      let recordedCount = 0;
      if (newIssueItems.length > 0) {
        const existing = (await hubApi.getDiscrepancies(task.hubId))
          .filter((item) => item.inboundEventId === task.inboundId);

        for (const line of newIssueItems) {
          const review = reviews[line.orderItemId];
          if (!review) continue;
          const issueStatus = review.status as Exclude<ReviewStatus, 'PENDING' | 'OK'>;
          const marker = `[APP:${line.marketProductId}:${issueStatus}]`;
          const conditionStatus = toBackendCondition(issueStatus);
          const affectedQuantity = readQuantity(review.affectedQuantity);
          const notes = `${marker} ${ISSUE_LABEL[issueStatus]}. ${review.notes.trim()}`;
          const alreadyRecorded = existing.some((saved) => (
            saved.orderItemId === line.orderItemId
            && saved.conditionStatus === conditionStatus
            && saved.affectedQuantity === affectedQuantity
            && saved.notes?.includes(marker)
          ));
          if (!alreadyRecorded) {
            await hubApi.recordDiscrepancy(task.hubId, task.inboundId, {
              orderItemId: line.orderItemId,
              affectedQuantity,
              conditionStatus,
              notes,
            });
            recordedCount += 1;
          }
        }
      }

      if (newIssueItems.length > 0) {
        Alert.alert(
          'Đã gửi Admin xử lý',
          `${newIssueItems.length} dòng hàng có vấn đề đã được tạo ở trạng thái OPEN (${recordedCount} dòng đơn mới). Admin/Operations có thể xem và xác nhận kết quả này.`,
          [{ text: 'Về danh sách lô', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(
          'Đã kiểm tra lô hàng',
          'Tất cả đơn hàng nhà hàng khớp với lô bàn giao.',
          [{ text: 'Về danh sách lô', onPress: () => navigation.goBack() }],
        );
      }
    } catch (error) {
      Alert.alert(
        'Chưa hoàn tất ghi nhận',
        `${getErrorMessage(error)}\n\nNếu lô đã chuyển sang “Đã nhận”, hãy giữ nguyên thông tin và thử gửi lại; App sẽ bỏ qua các discrepancy đã lưu.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.screen}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.taskCard}>
            <View style={styles.taskTop}>
              <View style={[styles.taskIcon, received && styles.taskIconReceived]}>
                <Ionicons name={received ? 'checkmark' : 'cube-outline'} size={23} color={Colors.primaryText} />
              </View>
              <View style={styles.taskCopy}>
                <Text numeric style={styles.taskCode}>{shortCode('IN', task.inboundId)}</Text>
                <Text numberOfLines={1} style={styles.hubName}>{task.hub.name}</Text>
              </View>
              <View style={[styles.statusBadge, received ? styles.statusReceived : styles.statusPending]}>
                <Text style={[styles.statusText, received ? styles.statusTextReceived : styles.statusTextPending]}>
                  {readOnly ? 'Đã kiểm tra' : received ? 'Đã đến Hub' : 'Chờ nhận'}
                </Text>
              </View>
            </View>
            <View style={styles.taskInfo}>
              <Info label="Lô bàn giao" value={shortCode('LÔ', task.deliveryScheduleId)} numeric />
              <Info label="Khối lượng" value={`${formatQuantity(task.totalQuantityKg)} kg`} numeric />
              <Info label="Đơn nhà hàng" value={loadingBatch ? '...' : `${orders.length}`} numeric />
            </View>
          </View>

          <View style={styles.operationNotice}>
            {loadingBatch
              ? <ActivityIndicator size="small" color="#8A5900" />
              : <Ionicons name="shield-checkmark-outline" size={20} color="#8A5900" />}
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{readOnly ? 'Kết quả đã khóa' : 'Kiểm tra và gửi Admin'}</Text>
              <Text style={styles.noticeText}>
                {readOnly
                  ? 'Lô đã được ghi nhận tại Hub. Bạn chỉ có thể xem kết quả; Admin/Operations phụ trách xử lý tiếp.'
                  : 'Hàng có vấn đề sẽ được tạo ở trạng thái OPEN để Admin/Operations xác nhận.'}
              </Text>
              {batchError ? (
                <Pressable style={styles.retryRow} onPress={() => void loadBatch()}>
                  <Text style={styles.batchError}>{batchError}</Text>
                  <Ionicons name="refresh" size={16} color="#8A5900" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View>
                <Text style={styles.progressLabel}>TIẾN ĐỘ ĐỐI CHIẾU</Text>
                <Text style={styles.progressTitle}>
                  {readOnly
                    ? loadingBatch ? 'Đang tải kết quả' : 'Kết quả đã ghi nhận'
                    : allChecked ? 'Đã kiểm đủ từng đơn' : 'Đang kiểm theo đơn nhà hàng'}
                </Text>
              </View>
              <Text numeric style={styles.progressValue}>{checkedCount}/{orderLines.length}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${orderLines.length ? (checkedCount / orderLines.length) * 100 : 0}%`,
              }]} />
            </View>
            <Text numeric style={styles.progressMeta}>
              Đã đối chiếu {checkedCount}/{orderLines.length} dòng hàng trong {orders.length} đơn
              {issueItems.length > 0 ? ` · ${issueItems.length} dòng có vấn đề` : ''}
            </Text>
          </View>

          <View style={styles.headingRow}>
            <View>
              <Text style={styles.sectionTitle}>Kiểm tra theo đơn nhà hàng</Text>
              <Text style={styles.sectionSubtitle}>
                {readOnly
                  ? 'Chỉ xem · kết quả được khóa theo từng dòng đơn'
                  : 'Đối chiếu riêng từng đơn, không dùng số lượng gộp của lô'}
              </Text>
            </View>
          </View>

          <View
            style={styles.productList}
            onLayout={(event) => {
              productListOffsetY.current = event.nativeEvent.layout.y;
            }}
          >
            {orders.map((order, orderIndex) => (
              <View
                key={order.orderId}
                style={styles.orderGroup}
                onLayout={(event) => {
                  orderGroupOffsets.current[order.orderId] = event.nativeEvent.layout.y;
                }}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIndexBadge}>
                    <Text numeric style={styles.orderIndexText}>{orderIndex + 1}</Text>
                  </View>
                  <View style={styles.orderCopy}>
                    <Text style={styles.restaurantName} numberOfLines={1}>{order.restaurantName}</Text>
                    <Text numeric style={styles.orderCode}>{shortCode('ĐH', order.orderId)}</Text>
                  </View>
                  <Text numeric style={styles.orderItemCount}>{order.items.length} dòng</Text>
                </View>

                <View style={styles.orderItems}>
                  {order.items.map((item, itemIndex) => {
                    const line: OrderLine = {
                      orderId: order.orderId,
                      orderItemId: item.orderItemId,
                      restaurantName: order.restaurantName,
                      marketProductId: item.marketProductId ?? '',
                      productName: item.productName,
                      quantity: item.quantity,
                      unit: item.unit,
                    };
                    const review = reviews[line.orderItemId] ?? {
                      status: 'PENDING' as const,
                      affectedQuantity: '',
                      notes: '',
                    };
                    const hasIssue = review.status !== 'PENDING' && review.status !== 'OK';
                    const persisted = review.persisted === true;
                    const locked = readOnly || persisted;
                    const visibleReviewOptions = readOnly
                      ? REVIEW_OPTIONS.filter((option) => option.id === review.status)
                      : REVIEW_OPTIONS;

                    return (
                      <View
                        key={line.orderItemId}
                        style={[styles.productCard, hasIssue && styles.productCardIssue]}
                        onLayout={(event) => {
                          productCardOffsets.current[line.orderItemId] =
                            (orderGroupOffsets.current[order.orderId] ?? 0) + event.nativeEvent.layout.y;
                        }}
                      >
                        <View style={styles.productHeader}>
                          <View style={[styles.productIndex, hasIssue && styles.productIndexIssue]}>
                            <Text numeric style={styles.productIndexText}>{itemIndex + 1}</Text>
                          </View>
                          <View style={styles.productCopy}>
                            <Text style={styles.productName}>{line.productName}</Text>
                            <Text numeric style={styles.expectedText}>
                              Theo đơn: {formatQuantityWithUnit(line.quantity, line.unit)}
                            </Text>
                          </View>
                          {persisted ? (
                            <View style={[
                              styles.savedBadge,
                              review.serverStatus === 'ACKNOWLEDGED' && styles.savedBadgeDone,
                            ]}>
                              <Text style={styles.savedBadgeText}>
                                {review.serverStatus === 'ACKNOWLEDGED' ? 'Đã xác nhận' : 'Chờ Admin'}
                              </Text>
                            </View>
                          ) : review.status === 'PENDING' ? (
                            <Text style={styles.pendingLabel}>{readOnly ? 'Chưa tải' : 'Chưa kiểm'}</Text>
                          ) : hasIssue ? (
                            <Ionicons name="alert-circle" size={22} color={Colors.warning} />
                          ) : (
                            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                          )}
                        </View>

                        <View style={styles.optionGrid}>
                          {visibleReviewOptions.map((option) => {
                            const active = review.status === option.id;
                            return (
                              <Pressable
                                key={option.id}
                                disabled={locked}
                                style={[
                                  styles.optionChip,
                                  active && styles.optionChipActive,
                                  locked && !active && styles.optionChipDisabled,
                                ]}
                                onPress={() => selectStatus(line.orderItemId, option.id)}
                              >
                                <Ionicons
                                  name={option.icon}
                                  size={15}
                                  color={active ? Colors.primaryText : Colors.textMuted}
                                />
                                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        {hasIssue ? (
                          <View style={styles.issueForm}>
                            <View style={styles.quantityInputRow}>
                              <View style={styles.inputCopy}>
                                <Text style={styles.inputLabel}>Số lượng ảnh hưởng</Text>
                                <Text style={styles.inputHint}>
                                  Tối đa {formatQuantityWithUnit(line.quantity, line.unit)} trong đơn này
                                </Text>
                              </View>
                              <View style={styles.quantityInputWrap}>
                                <TextInput
                                  value={review.affectedQuantity}
                                  editable={!locked}
                                  onChangeText={(value) => updateReview(line.orderItemId, {
                                    affectedQuantity: value.replace(/[^0-9.,]/g, ''),
                                  })}
                                  keyboardType="decimal-pad"
                                  onFocus={() => scrollToIssueField(line.orderItemId, 70)}
                                  placeholder="0"
                                  placeholderTextColor={Colors.textMuted}
                                  style={styles.quantityInput}
                                />
                                <Text style={styles.quantityUnit}>{getQuantityUnit(line.unit)}</Text>
                              </View>
                            </View>
                            <Text style={styles.inputLabel}>Mô tả tình trạng</Text>
                            <TextInput
                              value={review.notes}
                              editable={!locked}
                              onChangeText={(notes) => updateReview(line.orderItemId, { notes })}
                              onFocus={() => scrollToIssueField(line.orderItemId, 145)}
                              placeholder={review.status === 'WRONG_ITEM'
                                ? 'Ghi rõ mặt hàng thực tế nhận sai...'
                                : 'Tình trạng và cách xử lý tạm thời...'}
                              placeholderTextColor={Colors.textMuted}
                              multiline
                              textAlignVertical="top"
                              maxLength={500}
                              style={styles.notesInput}
                            />
                            <Text style={styles.restaurantHint}>
                              {persisted
                                ? review.serverStatus === 'ACKNOWLEDGED'
                                  ? 'Admin/Operations đã xác nhận discrepancy.'
                                  : 'Đã gửi Admin/Operations · trạng thái OPEN.'
                                : `${shortCode('ĐH', line.orderId)} · ${line.restaurantName}`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {!readOnly && issueValidationError ? (
            <View style={styles.validationCard}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.validationText}>{issueValidationError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>Kết quả</Text>
            <Text numeric style={styles.footerValue}>
              {issueItems.length > 0 ? `${issueItems.length} cần xử lý` : `${checkedCount}/${orderLines.length} đã kiểm`}
            </Text>
          </View>
          <Pressable
            style={[styles.submitButton, submitDisabled && styles.buttonDisabled]}
            disabled={submitDisabled}
            onPress={() => readOnly ? navigation.goBack() : void submit()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <Ionicons
                name={readOnly ? 'close' : issueItems.length > 0 ? 'notifications-outline' : 'checkmark-done'}
                size={19}
                color={Colors.onPrimary}
              />
            )}
            <Text style={styles.submitButtonText}>
              {readOnly
                ? 'Đóng'
                : submitting
                ? 'Đang lưu...'
                : issueItems.some((line) => !reviews[line.orderItemId]?.persisted)
                  ? 'Xác nhận lô & gửi Admin'
                  : received
                    ? 'Đóng kết quả'
                    : 'Xác nhận lô hàng'}
            </Text>
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Info({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} numeric={numeric} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  keyboardArea: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  taskCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 14, elevation: 1 },
  taskTop: { flexDirection: 'row', alignItems: 'center' },
  taskIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  taskIconReceived: { backgroundColor: Colors.primaryLight },
  taskCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  taskCode: { fontSize: 14, fontFamily: Fonts.monoBold, color: Colors.deepTeal },
  hubName: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  statusPending: { backgroundColor: Colors.warningLight },
  statusReceived: { backgroundColor: Colors.primaryLight },
  statusText: { fontSize: 9, fontWeight: '700' },
  statusTextPending: { color: '#8A5900' },
  statusTextReceived: { color: Colors.primaryText },
  taskInfo: { flexDirection: 'row', marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: Colors.border },
  infoItem: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  infoLabel: { fontSize: 9, color: Colors.textMuted },
  infoValue: { fontSize: 10, fontWeight: '600', color: Colors.textPrimary, marginTop: 3 },
  operationNotice: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#D9B967', backgroundColor: Colors.warningLight, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: 11, fontWeight: '800', color: '#704700' },
  noticeText: { fontSize: 9, lineHeight: 14, color: '#805B20', marginTop: 3 },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E6CF95' },
  batchError: { flex: 1, fontSize: 8, lineHeight: 12, color: Colors.danger },
  progressCard: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 13 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressLabel: { fontSize: 8, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  progressTitle: { fontSize: 11, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  progressValue: { fontSize: 14, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: Colors.surfaceContainerHigh, overflow: 'hidden', marginTop: 11 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: Colors.primary },
  progressMeta: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textSecondary, marginTop: 7 },
  headingRow: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.deepTeal },
  sectionSubtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  productList: { gap: 10 },
  orderGroup: { borderRadius: 15, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow, overflow: 'hidden' },
  orderHeader: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  orderIndexBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  orderIndexText: { fontSize: 12, fontFamily: Fonts.monoBold, color: Colors.deepTeal },
  orderCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  restaurantName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  orderCode: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textMuted, marginTop: 3 },
  orderItemCount: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.primaryText },
  orderItems: { padding: 9, gap: 8 },
  productCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 13, elevation: 1 },
  productCardIssue: { borderColor: '#D9B967', backgroundColor: '#FFFCF4' },
  productHeader: { flexDirection: 'row', alignItems: 'center' },
  productIndex: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  productIndexIssue: { backgroundColor: '#FFE8B8' },
  productIndexText: { fontSize: 13, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  productCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  productName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  expectedText: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textMuted, marginTop: 3 },
  pendingLabel: { fontSize: 8, color: Colors.warning, fontWeight: '700' },
  savedBadge: { borderRadius: 999, backgroundColor: Colors.warningLight, paddingHorizontal: 8, paddingVertical: 5 },
  savedBadgeDone: { backgroundColor: Colors.primaryLight },
  savedBadgeText: { fontSize: 8, fontWeight: '800', color: Colors.primaryText },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  optionChip: { minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  optionChipActive: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  optionChipDisabled: { opacity: 0.42 },
  optionText: { fontSize: 8, fontWeight: '700', color: Colors.textSecondary },
  optionTextActive: { color: Colors.primaryText },
  issueForm: { marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#E6CF95', gap: 7 },
  quantityInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputCopy: { flex: 1 },
  inputLabel: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary },
  inputHint: { fontSize: 8, color: Colors.textMuted, marginTop: 2 },
  quantityInputWrap: { minWidth: 120, height: 40, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9 },
  quantityInput: { flex: 1, paddingVertical: 0, textAlign: 'right', fontSize: 12, fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  quantityUnit: { fontSize: 8, color: Colors.textMuted, marginLeft: 5 },
  notesInput: { minHeight: 70, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 10, fontSize: 10, lineHeight: 15, color: Colors.textPrimary },
  restaurantHint: { fontSize: 8, lineHeight: 12, color: Colors.textMuted },
  validationCard: { marginTop: 12, borderRadius: 11, borderWidth: 1, borderColor: '#E6B8B8', backgroundColor: Colors.dangerLight, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  validationText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.danger },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerSummary: { minWidth: 86 },
  footerLabel: { fontSize: 9, color: Colors.textMuted },
  footerValue: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.deepTeal, marginTop: 2 },
  submitButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: Colors.primary, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonDisabled: { opacity: 0.45 },
  submitButtonText: { color: Colors.onPrimary, fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
