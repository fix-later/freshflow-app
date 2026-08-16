import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import {
  orderApi,
  type OrderDto,
  type OrderItemDto,
  type OrderStatus,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
} from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';
import { createOrderStatusConnection } from '../realtime/orderRealtime';
import { restaurantApi, type DeliveryAddressDto } from '../../restaurant/api/restaurantApi';
import { stopAfterStart } from '../../../utils/signalr';
import { describeApiCode, getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import {
  claimsApi,
  CLAIM_STATUS_COLOR,
  CLAIM_STATUS_LABEL,
  type OrderClaimDto,
} from '../../claims/api/claimsApi';
import { FileClaimModal } from '../../claims/components/FileClaimModal';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'OrderDetail'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Order can only be cancelled by the restaurant before the market/hub starts processing it.
const CANCELLABLE_STATUSES: OrderStatus[] = ['draft', 'confirmed'];

const PAYMENT_STATUS_LABEL: Record<OrderDto['paymentStatus'], string> = {
  not_applicable: 'Chưa phát sinh công nợ',
  outstanding: 'Công nợ chưa thanh toán',
  settled: 'Đã tất toán',
  waived: 'Đã miễn/hoàn công nợ',
};

const OTHER_REASON_ID = 'other';
const CANCEL_REASON_OPTIONS = [
  { id: 'wrong_item', label: 'Đặt nhầm sản phẩm hoặc số lượng' },
  { id: 'change_items', label: 'Muốn thay đổi sản phẩm trong đơn hàng' },
  { id: 'change_schedule', label: 'Muốn đổi thời gian giao hàng' },
  { id: 'changed_address', label: 'Thay đổi địa chỉ giao hàng' },
  { id: OTHER_REASON_ID, label: 'Khác' },
];



function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()} • ${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

/**
 * `scheduledFor`'s clock time is always the same fixed early-morning hour now
 * (see `DELIVERY_HOUR` in `CreateOrderScreen.tsx`) — the actual delivery can
 * land anywhere in that window, so this shows the date plus the window
 * instead of the stored instant's own minute, which would read as an exact time.
 */
function formatDeliveryWindow(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
  return `${day} (4:00 - 6:00 sáng)`;
}

function ItemRow({
  item,
  index,
  editable,
  busy,
  onChangeQuantity,
  onRemove,
}: {
  item: OrderItemDto;
  index: number;
  editable: boolean;
  busy: boolean;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const quantity = item.quantity ?? 0;
  const unitPrice = item.unitPrice ?? 0;
  const subtotal = item.subtotal ?? unitPrice * quantity;
  // Kg per case — same fallback-to-1 pattern as CartModal/AddDraftOrderItemScreen.
  // Always 1 today since the backend doesn't send `packingWeightKg` yet (see the
  // field's doc comment on `OrderItemDto`); this picks it up automatically once it does.
  const step = item.packingWeightKg && item.packingWeightKg > 0 ? item.packingWeightKg : 1;
  return (
    <View style={styles.itemRow}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImg} />
      ) : (
        <View style={[styles.itemImg, styles.itemImgPlaceholder]}>
          <Ionicons name="image-outline" size={22} color={Colors.outline} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.productNameSnapshot || 'Sản phẩm'}</Text>
        <Text style={styles.itemUnitPrice}>{unitPrice.toLocaleString('vi-VN')}đ x {quantity}</Text>
        {item.actualQuantity !== null && item.actualQuantity !== quantity ? (
          <Text style={styles.actualQuantity}>Thực nhận: {item.actualQuantity}</Text>
        ) : null}
        {item.vatRatePercent !== null && item.vatRatePercent > 0 ? (
          <Text style={styles.itemVatText}>
            VAT ({item.vatRatePercent}%){item.vatAmount !== null ? `: ${item.vatAmount.toLocaleString('vi-VN')}đ` : ''}
          </Text>
        ) : null}
        {editable ? (
          <View style={styles.draftItemActions}>
            <Pressable
              style={styles.quantityButton}
              onPress={() => onChangeQuantity(quantity - step)}
              disabled={busy || quantity <= step}
            >
              <Ionicons name="remove" size={15} color={Colors.primaryText} />
            </Pressable>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <Pressable
              style={styles.quantityButton}
              onPress={() => onChangeQuantity(quantity + step)}
              disabled={busy}
            >
              <Ionicons name="add" size={15} color={Colors.primaryText} />
            </Pressable>
            <Pressable style={styles.removeItemButton} onPress={onRemove} disabled={busy}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Text style={styles.itemSubtotal}>{subtotal.toLocaleString('vi-VN')}đ</Text>
      )}
    </View>
  );
}

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddressDto[] | null>(null);
  const [fileClaimModalVisible, setFileClaimModalVisible] = useState(false);
  const [orderClaims, setOrderClaims] = useState<OrderClaimDto[]>([]);

  // BE returns addresses sorted default-first — the first entry is always the right preselect.
  const selectedAddress = deliveryAddresses?.[0] ?? null;

  const performReorder = async () => {
    if (!order) return;
    setReordering(true);
    try {
      const draft = await orderApi.reorder(order.orderId);
      Alert.alert(
        'Đã tạo bản nháp mới',
        'Giá và tồn kho đã được kiểm tra lại theo dữ liệu hiện tại.',
        [
          {
            text: 'Xem bản nháp',
            onPress: () => navigation.push('OrderDetail', { orderId: draft.orderId }),
          },
        ],
      );
    } catch (err: unknown) {
      Alert.alert('Không thể đặt lại đơn', getApiErrorMessage(err, 'Sản phẩm hiện không còn đủ điều kiện để đặt lại.'));
    } finally {
      setReordering(false);
    }
  };

  const handleReorder = () => {
    Alert.alert(
      'Đặt lại đơn hàng',
      'Tạo một bản nháp mới từ đơn này với giá và tồn kho hiện tại?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Tạo bản nháp', onPress: performReorder },
      ],
    );
  };

  const openCancelModal = () => {
    setSelectedReasonId(null);
    setCustomReason('');
    setCancelReasonError(null);
    setCancelModalVisible(true);
  };

  const fetchOrder = useCallback(async () => {
    setError(null);
    try {
      const data = await orderApi.getById(orderId);
      setOrder(data);
      // Fetch claims for this order
      claimsApi
        .listClaims({ pageSize: 100 })
        .then((res) => {
          setOrderClaims(res.items.filter((c) => c.orderId === orderId));
        })
        .catch(() => setOrderClaims([]));
    } catch {
      setError('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrder();
      restaurantApi
        .getDeliveryAddresses()
        .then(setDeliveryAddresses)
        .catch(() => setDeliveryAddresses([]));
      const connection = createOrderStatusConnection((event) => {
        if (event.orderId === orderId) fetchOrder();
      });
      const startAttempt = connection.start().catch((connectionError) => {
        const msg = String(connectionError);
        if (
          !msg.includes('stopped during negotiation') &&
          !msg.includes('Failed to start') &&
          !msg.includes('Server timeout')
        ) {
          console.warn('Order detail realtime connection failed:', connectionError);
        }
      });

      return () => {
        stopAfterStart(connection, startAttempt);
      };
    }, [fetchOrder]),
  );

  const performCancel = async (reason: string) => {
    setCancelling(true);
    try {
      await orderApi.cancel(orderId, reason);
      // Refetch via GET /orders/{id} rather than using the mutation's own response —
      // only that endpoint enriches items.imageUrl (see OrderItemDto's comment).
      await fetchOrder();
      setCancelModalVisible(false);
      Alert.alert('Đã hủy đơn', 'Đơn hàng của bạn đã được hủy thành công.');
    } catch (err: unknown) {
      Alert.alert('Không thể hủy đơn', getApiErrorMessage(err, 'Đơn hàng không còn ở trạng thái cho phép hủy.'));
    } finally {
      setCancelling(false);
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    if (!selectedReasonId) {
      setCancelReasonError('Vui lòng chọn lý do hủy đơn.');
      return;
    }
    const isOther = selectedReasonId === OTHER_REASON_ID;
    const reason = isOther
      ? customReason.trim()
      : CANCEL_REASON_OPTIONS.find((o) => o.id === selectedReasonId)?.label ?? '';
    if (!reason) {
      setCancelReasonError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    Alert.alert(
      'Xác nhận hủy đơn',
      `Bạn có chắc chắn muốn hủy đơn #${code}? Hành động này không thể hoàn tác.`,
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy đơn', style: 'destructive', onPress: () => performCancel(reason) },
      ],
    );
  };

  const performConfirmReceipt = async () => {
    setConfirmingReceipt(true);
    try {
      await orderApi.confirmReceipt(orderId);
      await fetchOrder();
      Alert.alert('Đã xác nhận', 'Bạn đã xác nhận nhận hàng cho đơn này.');
    } catch (err: unknown) {
      Alert.alert('Không thể xác nhận', getApiErrorMessage(err, 'Đơn hàng chưa ở trạng thái đã giao.'));
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handleConfirmReceipt = () => {
    Alert.alert(
      'Xác nhận đã nhận hàng',
      'Bạn xác nhận đã nhận đủ sản phẩm cho đơn hàng này?',
      [
        { text: 'Chưa', style: 'cancel' },
        { text: 'Đã nhận hàng', onPress: performConfirmReceipt },
      ],
    );
  };

  const updateDraftItem = async (item: OrderItemDto, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingItemId(item.orderItemId);
    try {
      await orderApi.updateItem(orderId, item.orderItemId, quantity);
      await fetchOrder();
    } catch (err: unknown) {
      Alert.alert('Không thể cập nhật sản phẩm', getApiErrorMessage(err, 'Vui lòng kiểm tra tồn kho và thử lại.'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeDraftItem = (item: OrderItemDto) => {
    Alert.alert(
      'Xóa sản phẩm',
      `Xóa "${item.productNameSnapshot}" khỏi bản nháp?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setUpdatingItemId(item.orderItemId);
            try {
              await orderApi.removeItem(orderId, item.orderItemId);
              await fetchOrder();
            } catch (err: unknown) {
              Alert.alert('Không thể xóa sản phẩm', getApiErrorMessage(err, 'Vui lòng thử lại.'));
            } finally {
              setUpdatingItemId(null);
            }
          },
        },
      ],
    );
  };

  const performConfirmOrder = async () => {
    if (!selectedAddress) return; // guarded by handleConfirmOrder before this is ever wired up
    setConfirmingOrder(true);
    try {
      const preview = await orderApi.previewConfirmation(orderId, selectedAddress.id);
      if (!preview.wouldSucceed) {
        const issueText = preview.issues
          .map((issue) => `• ${describeApiCode(issue.code, issue.message)}`)
          .join('\n');
        Alert.alert('Chưa thể xác nhận đơn', issueText || 'Đơn hàng chưa đáp ứng điều kiện xác nhận.');
        return;
      }

      const confirmed = await orderApi.confirm(orderId, selectedAddress.id);
      await fetchOrder();
      Alert.alert(
        'Đã xác nhận đơn hàng',
        `Dự kiến giao: ${formatDeliveryWindow(confirmed.scheduledFor)}`,
      );
    } catch (err: unknown) {
      Alert.alert('Không thể xác nhận đơn', getApiErrorMessage(err, 'Vui lòng thử lại.'));
    } finally {
      setConfirmingOrder(false);
    }
  };

  const handleConfirmOrder = () => {
    if (!selectedAddress) {
      Alert.alert(
        'Chưa có địa chỉ giao hàng',
        'Vui lòng thêm địa chỉ giao hàng trước khi xác nhận đơn.',
        [
          // Pushed onto this same stack (registered alongside OrderDetail) rather than
          // switching to the Profile tab, so the header back button returns here.
          { text: 'Thêm địa chỉ', onPress: () => navigation.navigate('DeliveryAddresses') },
          { text: 'Để sau', style: 'cancel' },
        ],
      );
      return;
    }
    Alert.alert(
      'Xác nhận đơn hàng',
      `Giao tới: ${selectedAddress.addressLine}\nHệ thống sẽ khóa giá và ghi nhận công nợ cho đơn này.`,
      [
        { text: 'Chưa', style: 'cancel' },
        { text: 'Xác nhận', onPress: performConfirmOrder },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy đơn hàng'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrder(); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = ORDER_STATUS_LABEL[order.status] || order.status;
  const statusColor = ORDER_STATUS_COLOR[order.status] || Colors.outline;
  const code = (order.orderId || '').slice(0, 8).toUpperCase() || 'N/A';
  const items = order.items ?? [];
  // Distinct products, not total kg — `quantity` is a weight, not a unit count.
  const itemCount = items.length;
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canConfirmOrder = order.status === 'draft' && items.length > 0;
  const canConfirmReceipt = order.status === 'delivered' && !order.confirmedReceiptAt;
  const canReportIssue = order.status === 'delivered';
  const canFileClaim = order.status === 'at_hub' || order.status === 'delivered';
  const canReorder = items.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Status header ── */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="receipt-outline" size={16} color={Colors.primaryText} />
              <Text style={styles.orderCode}>Đơn #{code}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + '12', borderColor: statusColor + '25' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>Đặt lúc {formatDateTime(order.createdAt)}</Text>
          </View>
          {order.scheduledFor ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>Hẹn giao {formatDeliveryWindow(order.scheduledFor)}</Text>
            </View>
          ) : null}
          {order.confirmedReceiptAt ? (
            <View style={styles.metaRow}>
              <Ionicons name="checkmark-circle-outline" size={13} color={Colors.success} />
              <Text style={styles.metaText}>Đã nhận hàng lúc {formatDateTime(order.confirmedReceiptAt)}</Text>
            </View>
          ) : null}
          {order.status === 'cancelled' && order.cancellationReason ? (
            <View style={styles.cancelInfoBox}>
              <Ionicons name="close-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.cancelInfoText}>{order.cancellationReason}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Items ── */}
        <Text style={styles.sectionTitle}>Sản phẩm ({itemCount} sản phẩm)</Text>
        <View style={styles.card}>
          <FlatList
            data={items}
            keyExtractor={(it, index) => it.orderItemId ?? it.marketProductId ?? String(index)}
            renderItem={({ item, index }) => (
              <ItemRow
                item={item}
                index={index}
                editable={order.status === 'draft'}
                busy={updatingItemId === item.orderItemId}
                onChangeQuantity={(quantity) => updateDraftItem(item, quantity)}
                onRemove={() => removeDraftItem(item)}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyItems}>
                <Ionicons name="basket-outline" size={28} color={Colors.outline} />
                <Text style={styles.emptyItemsText}>Bản nháp chưa có sản phẩm.</Text>
              </View>
            }
          />
        </View>
        {order.status === 'draft' ? (
          <Pressable
            style={styles.addDraftItemButton}
            onPress={() => navigation.navigate('AddDraftOrderItem', { orderId })}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primaryText} />
            <Text style={styles.addDraftItemButtonText}>Thêm sản phẩm</Text>
          </Pressable>
        ) : null}

        {/* ── Delivery address (snapshot captured at confirmation) ── */}
        {order.deliveryAddress ? (
          <>
            <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={Colors.primaryText} />
                <View style={{ flex: 1 }}>
                  {order.deliveryAddress.recipientName ? (
                    <Text style={styles.addressRecipient}>
                      {order.deliveryAddress.recipientName}
                      {order.deliveryAddress.phone ? ` • ${order.deliveryAddress.phone}` : ''}
                    </Text>
                  ) : null}
                  <Text style={styles.infoText}>{order.deliveryAddress.addressLine}</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Proof of Delivery Photo ── */}
        {order.proofUrl ? (
          <>
            <Text style={styles.sectionTitle}>Hình ảnh xác thực giao hàng (POD)</Text>
            <View style={[styles.card, styles.proofCardFull]}>
              <Pressable style={styles.proofImageWrapperFull} onPress={() => setProofModalVisible(true)}>
                <Image source={{ uri: order.proofUrl }} style={styles.proofImage} resizeMode="cover" />
                <View style={styles.proofBadgeOverlay}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.proofBadgeOverlayText}>Đã xác nhận bởi tài xế</Text>
                </View>
                <View style={styles.proofZoomOverlay}>
                  <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>

            {/* Proof image zoom modal */}
            <Modal
              visible={proofModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setProofModalVisible(false)}
            >
              <View style={styles.proofModalOverlay}>
                <Pressable style={styles.proofModalCloseBtn} onPress={() => setProofModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
                <Image source={{ uri: order.proofUrl }} style={styles.proofModalImage} resizeMode="contain" />
              </View>
            </Modal>
          </>
        ) : null}

        {/* ── Notes ── */}
        {order.notes ? (
          <>
            <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color={Colors.primaryText} />
                <Text style={styles.infoText}>{order.notes}</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Filed Claims ── */}
        {orderClaims.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Yêu cầu khiếu nại đền bù ({orderClaims.length})</Text>
            <View style={styles.claimsContainer}>
              {orderClaims.map((claim) => {
                const statusLower = (claim.status || '').toLowerCase();
                const isApproved = statusLower === 'approved';
                const isRejected = statusLower === 'rejected';
                const statusLabel = CLAIM_STATUS_LABEL[claim.status] || claim.status;
                const statusColor = CLAIM_STATUS_COLOR[claim.status] || Colors.textMuted;

                const borderColor = isApproved ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B';

                return (
                  <View key={claim.claimId} style={[styles.claimCardItem, { borderLeftColor: borderColor }]}>
                    {/* Header Row: Icon + Title + Status Pill */}
                    <View style={styles.claimCardHeaderRow}>
                      <View style={styles.claimHeaderLeft}>
                        <View style={[styles.claimIconWrap, { backgroundColor: statusColor + '18' }]}>
                          <Ionicons
                            name={isApproved ? 'shield-checkmark' : isRejected ? 'alert-circle' : 'time'}
                            size={16}
                            color={statusColor}
                          />
                        </View>
                        <Text style={styles.claimCardTitle}>
                          {isApproved ? 'Đã duyệt đền bù' : isRejected ? 'Khiếu nại bị từ chối' : 'Khiếu nại đang chờ xử lý'}
                        </Text>
                      </View>

                      <View style={[styles.claimStatusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                        <Text style={[styles.claimStatusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.claimDivider} />

                    {/* Amount Block */}
                    <View style={styles.claimAmountBlock}>
                      <Text style={styles.claimAmountLabel}>Số tiền yêu cầu đền bù:</Text>
                      <Text style={[styles.claimAmountVal, { color: isApproved ? '#059669' : Colors.textPrimary }]}>
                        {(claim.amount ?? 0).toLocaleString('vi-VN')}đ
                      </Text>
                    </View>

                    {/* Reason Box */}
                    <View style={styles.claimReasonBox}>
                      <Text style={styles.claimReasonLabel}>Lý do khiếu nại:</Text>
                      <Text style={styles.claimReasonVal}>{claim.reason}</Text>
                    </View>

                    {/* Admin Response Alert */}
                    {claim.decisionNote ? (
                      <View
                        style={[
                          styles.claimDecisionAlert,
                          isApproved ? styles.decisionApprovedAlert : styles.decisionRejectedAlert,
                        ]}
                      >
                        <Ionicons
                          name={isApproved ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={isApproved ? '#047857' : '#B91C1C'}
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.decisionAlertTitle, { color: isApproved ? '#047857' : '#B91C1C' }]}>
                            Phản hồi từ Admin:
                          </Text>
                          <Text style={[styles.decisionAlertText, { color: isApproved ? '#065F46' : '#991B1B' }]}>
                            {claim.decisionNote}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Footer Date */}
                    <View style={styles.claimFooterRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.claimFooterTime}>Ngày gửi: {formatDateTime(claim.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* ── Summary ── */}
        <Text style={styles.sectionTitle}>Tóm tắt</Text>
        <View style={styles.card}>
          {/*
            SubtotalAmount is recalculated from item prices on every draft edit, so it's
            already > 0 before confirmation — it alone can't gate this breakdown. VatAmount/
            DeliveryFee/DeliveryDistanceKm stay locked at 0 until ApplyConfirmationPricing runs
            at confirm time, so use deliveryAddress (also only set on confirm) as the real gate.
          */}
          {order.deliveryAddress ? (
            <>
              <View style={[styles.summaryRow, styles.summaryBreakdownRow]}>
                <Text style={styles.summarySecondaryLabel}>Tạm tính</Text>
                <Text style={styles.summaryBreakdownValue}>{order.subtotalAmount.toLocaleString('vi-VN')}đ</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryBreakdownRow]}>
                <Text style={styles.summarySecondaryLabel}>
                  Phí giao hàng{order.deliveryDistanceKm > 0 ? ` (${order.deliveryDistanceKm.toFixed(1)} km)` : ''}
                </Text>
                <Text style={styles.summaryBreakdownValue}>{order.deliveryFee.toLocaleString('vi-VN')}đ</Text>
              </View>
              {order.vatAmount > 0 ? (
                <View style={[styles.summaryRow, styles.summaryBreakdownRow]}>
                  <Text style={styles.summarySecondaryLabel}>VAT</Text>
                  <Text style={styles.summaryBreakdownValue}>{order.vatAmount.toLocaleString('vi-VN')}đ</Text>
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Tổng tiền</Text>
            <Text style={styles.summaryTotalValue}>{(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={[styles.summaryRow, styles.summarySecondaryRow]}>
            <Text style={styles.summarySecondaryLabel}>Thanh toán B2B</Text>
            <Text style={styles.summarySecondaryValue}>
              {PAYMENT_STATUS_LABEL[order.paymentStatus]}
            </Text>
          </View>
        </View>

        {/* ── Reorder / Recurring Buttons (B2B Convenience) ── */}
        {canReorder ? (
          <View style={styles.orderConvenienceRow}>
            <Pressable
              style={({ pressed }) => [
                styles.reorderCardBtn,
                (pressed || reordering) && { opacity: 0.7 },
              ]}
              onPress={handleReorder}
              disabled={reordering}
            >
              <View style={styles.reorderIconWrap}>
                {reordering ? (
                  <ActivityIndicator size="small" color={Colors.primaryText} />
                ) : (
                  <Ionicons name="repeat" size={18} color={Colors.primaryText} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reorderCardBtnTitle}>Tạo bản nháp mới</Text>
                <Text style={styles.reorderCardBtnSub}>Từ sản phẩm đơn này</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.reorderCardBtn, pressed && { opacity: 0.7 }]}
              onPress={() => {
                // Merge by marketProductId — an order can carry more than one line for the same
                // product (AddOrderItemCommandHandler sums quantities rather than rejecting a
                // repeat add), and the schedule's item picker treats marketProductId as a unique
                // key everywhere else.
                const merged = new Map<string, number>();
                for (const item of items) {
                  merged.set(item.marketProductId, (merged.get(item.marketProductId) ?? 0) + item.quantity);
                }
                navigation.navigate('CreateRecurringOrder', {
                  prefillItems: Array.from(merged, ([marketProductId, quantity]) => ({
                    marketProductId,
                    quantity,
                  })),
                });
              }}
            >
              <View style={styles.reorderIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reorderCardBtnTitle}>Đặt lịch định kỳ</Text>
                <Text style={styles.reorderCardBtnSub}>Giao tự động hàng tuần</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Draft/confirmed actions ── */}
      {canCancel || canConfirmOrder ? (
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            {canCancel ? (
              <Pressable style={styles.cancelBtn} onPress={openCancelModal}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.cancelBtnText}>Hủy đơn hàng</Text>
              </Pressable>
            ) : null}
            {canConfirmOrder ? (
              <Pressable
                style={[styles.confirmReceiptBtn, confirmingOrder && styles.confirmReceiptBtnDisabled]}
                onPress={handleConfirmOrder}
                disabled={confirmingOrder}
              >
                {confirmingOrder ? (
                  <ActivityIndicator color={Colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.confirmReceiptBtnText}>Xác nhận đơn</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Confirm receipt / report issue / claim footer ── */}
      {canConfirmReceipt || canReportIssue || canFileClaim ? (
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            {canFileClaim ? (
              <Pressable style={styles.claimBtn} onPress={() => setFileClaimModalVisible(true)}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#1D4ED8" />
                <Text style={styles.claimBtnText}>Khiếu nại đền bù</Text>
              </Pressable>
            ) : null}
            {canReportIssue ? (
              <Pressable style={styles.reportIssueBtn} onPress={() => navigation.navigate('ReportIssue', { orderId })}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
                <Text style={styles.reportIssueBtnText}>Báo sự cố</Text>
              </Pressable>
            ) : null}
            {canConfirmReceipt ? (
              <Pressable
                style={[styles.confirmReceiptBtn, confirmingReceipt && styles.confirmReceiptBtnDisabled]}
                onPress={handleConfirmReceipt}
                disabled={confirmingReceipt}
              >
                {confirmingReceipt
                  ? <ActivityIndicator color={Colors.onPrimary} size="small" />
                  : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color={Colors.onPrimary} />
                      <Text style={styles.confirmReceiptBtnText}>Xác nhận đã nhận hàng</Text>
                    </>
                  )
                }
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── File Claim Modal ── */}
      {order ? (
        <FileClaimModal
          visible={fileClaimModalVisible}
          orderId={order.orderId}
          orderCode={code}
          totalAmount={order.totalAmount}
          onClose={() => setFileClaimModalVisible(false)}
          onSuccess={(newClaim) => {
            setFileClaimModalVisible(false);
            setOrderClaims((prev) => [newClaim, ...prev]);
          }}
        />
      ) : null}

      {/* ── Cancel confirmation modal ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setCancelModalVisible(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Chọn lý do hủy</Text>
                  <Pressable
                    style={styles.modalCloseBtn}
                    onPress={() => setCancelModalVisible(false)}
                    disabled={cancelling}
                  >
                    <Ionicons name="close" size={20} color={Colors.onSurface} />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.modalScrollArea}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.modalWarningBox}>
                    <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                    <Text style={styles.modalWarningText}>
                      Đơn #{code} sẽ bị hủy toàn bộ sản phẩm và không thể hoàn tác sau khi xác nhận.
                    </Text>
                  </View>

                  {CANCEL_REASON_OPTIONS.map((option) => {
                    const selected = selectedReasonId === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={styles.modalReasonRow}
                        onPress={() => {
                          setSelectedReasonId(option.id);
                          if (cancelReasonError) setCancelReasonError(null);
                        }}
                      >
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={selected ? Colors.primaryText : Colors.outline}
                        />
                        <Text style={styles.modalReasonText}>{option.label}</Text>
                      </Pressable>
                    );
                  })}

                  {selectedReasonId === OTHER_REASON_ID ? (
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Nhập lý do khác..."
                      placeholderTextColor={Colors.outline}
                      value={customReason}
                      onChangeText={(text) => {
                        setCustomReason(text);
                        if (cancelReasonError) setCancelReasonError(null);
                      }}
                      multiline
                      maxLength={200}
                    />
                  ) : null}

                  {cancelReasonError ? (
                    <Text style={styles.modalErrorText}>{cancelReasonError}</Text>
                  ) : null}
                </ScrollView>

                <Pressable
                  style={[styles.modalDangerBtn, cancelling && styles.modalDangerBtnDisabled]}
                  onPress={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling
                    ? <ActivityIndicator color={Colors.onError} size="small" />
                    : <Text style={styles.modalDangerBtnText}>ĐỒNG Ý</Text>
                  }
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.outline, fontWeight: '500' },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: Colors.surfaceVariant, marginHorizontal: 12 },

  // Status header
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderCode: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  metaText: { fontSize: 12, color: Colors.textMuted },
  cancelInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    borderRadius: 8,
  },
  cancelInfoText: { flex: 1, fontSize: 12, color: Colors.error, lineHeight: 16 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10 },
  itemImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.surfaceVariant },
  itemImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, marginBottom: 4 },
  itemUnitPrice: { fontSize: 12, color: Colors.textSecondary },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: Colors.primaryText },
  emptyItems: { alignItems: 'center', gap: 7, padding: 20 },
  emptyItemsText: { fontSize: 12, color: Colors.textMuted },
  actualQuantity: { marginTop: 4, fontSize: 11, color: Colors.warning, fontWeight: '600' },
  itemVatText: { marginTop: 4, fontSize: 11, color: Colors.textMuted },
  addDraftItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  addDraftItemButtonText: { fontSize: 13, fontWeight: '800', color: Colors.primaryText },
  draftItemActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  quantityValue: { minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  removeItemButton: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
  },

  // Info rows (notes)
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { fontSize: 14, color: Colors.onSurface, flex: 1, lineHeight: 20 },
  addressRecipient: { fontSize: 13, fontWeight: '700', color: Colors.onSurface, marginBottom: 3 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  summaryTotalValue: { fontSize: 17, fontWeight: '800', color: Colors.primaryText },
  summarySecondaryRow: { borderTopWidth: 1, borderTopColor: Colors.surfaceVariant },
  summarySecondaryLabel: { fontSize: 12, color: Colors.textMuted },
  summarySecondaryValue: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  summaryBreakdownRow: { paddingVertical: 8 },
  summaryBreakdownValue: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  // Cancel footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
  },
  cancelBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },

  // Confirm receipt / report issue footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmReceiptBtn: {
    flex: 1.4,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmReceiptBtnDisabled: { opacity: 0.5 },
  confirmReceiptBtnText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  reportIssueBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  reportIssueBtnText: {
    color: '#D97706',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },

  // Cancel modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.onSurface },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  modalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningLight,
    padding: 10,
    borderRadius: 10,
  },
  modalWarningText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  modalScrollArea: { maxHeight: SCREEN_HEIGHT * 0.4 },
  modalScrollContent: { gap: 12 },
  modalReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  modalReasonText: { flex: 1, fontSize: 14, color: Colors.onSurface },
  modalInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.onSurface,
    textAlignVertical: 'top',
  },
  modalErrorText: { fontSize: 12, color: Colors.error },
  modalDangerBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
  },
  modalDangerBtnDisabled: { opacity: 0.6 },
  modalDangerBtnText: { color: Colors.onError, fontWeight: '700', fontSize: 14 },
  orderConvenienceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  reorderCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 12,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reorderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderCardBtnTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  reorderCardBtnSub: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
    marginTop: 1,
  },
  // ─── Proof of Delivery styles ─────────────────
  proofCardFull: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
  },
  proofImageWrapperFull: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: Colors.surfaceContainerLow,
  },
  proofBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  proofBadgeOverlayText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
  },
  proofImage: {
    width: '100%',
    height: '100%',
  },
  proofZoomOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofModalCloseBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofModalImage: {
    width: '92%',
    height: '80%',
  },
  claimBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  claimBtnText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  claimsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  claimCardItem: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  claimCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  claimHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  claimIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimCardTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  claimStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  claimStatusBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  claimDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  claimAmountBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  claimAmountLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
  claimAmountVal: {
    fontSize: 16,
    fontFamily: Fonts.monoBold,
  },
  claimReasonBox: {
    gap: 3,
    paddingHorizontal: 2,
  },
  claimReasonLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
  },
  claimReasonVal: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  claimDecisionAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  decisionApprovedAlert: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  decisionRejectedAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  decisionAlertTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  decisionAlertText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    lineHeight: 17,
  },
  claimFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  claimFooterTime: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
});
