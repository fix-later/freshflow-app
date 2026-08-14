import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  orderApi,
  type OrderListItemDto,
  type OrderStatus,
} from '../../orders/api/orderApi';
import { createOrderStatusConnection } from '../../orders/realtime/orderRealtime';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';
import { stopAfterStart } from '../../../utils/signalr';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type DeliveryFilter = 'active' | 'delivering' | 'delivered';

const DELIVERY_STATUSES: OrderStatus[] = [
  'confirmed',
  'batched',
  'picked_up',
  'at_hub',
  'delivering',
  'delivered',
];

const FILTERS: { key: DeliveryFilter; label: string }[] = [
  { key: 'active', label: 'Đang xử lý' },
  { key: 'delivering', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
];

const DELIVERY_STATUS: Record<
  Extract<OrderStatus, 'confirmed' | 'batched' | 'picked_up' | 'at_hub' | 'delivering' | 'delivered'>,
  { label: string; color: string; step: number }
> = {
  confirmed: { label: 'Đã xác nhận', color: Colors.secondary, step: 1 },
  batched: { label: 'Đã gom phiên thu mua', color: Colors.tertiary, step: 2 },
  picked_up: { label: 'Đã lấy tại chợ', color: Colors.tertiary, step: 2 },
  at_hub: { label: 'Đã về hub', color: Colors.secondary, step: 3 },
  delivering: { label: 'Đang giao', color: Colors.warning, step: 4 },
  delivered: { label: 'Đã giao', color: Colors.success, step: 5 },
};

function getOrderId(order: OrderListItemDto) {
  return order.orderId;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DeliveryProgress({ step }: { step: number }) {
  const labels = ['Xác nhận', 'Thu mua', 'Tại hub', 'Đang giao', 'Đã giao'];

  return (
    <View style={styles.progressRow}>
      {labels.map((label, index) => {
        const position = index + 1;
        const completed = position <= step;

        return (
          <View key={label} style={styles.progressItem}>
            {index > 0 ? (
              <View
                style={[
                  styles.progressLine,
                  position <= step && styles.progressLineCompleted,
                ]}
              />
            ) : null}
            <View style={[styles.progressDot, completed && styles.progressDotCompleted]}>
              {completed ? (
                <Ionicons name="checkmark" size={12} color={Colors.onPrimary} />
              ) : null}
            </View>
            <Text style={[styles.progressLabel, completed && styles.progressLabelCompleted]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function TrackOrderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RestaurantOrdersStackParamList>>();
  const [orders, setOrders] = useState<OrderListItemDto[]>([]);
  const [filter, setFilter] = useState<DeliveryFilter>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const response = await orderApi.list({ page: 1, pageSize: 100 });
      setOrders(response.data.filter((order) => DELIVERY_STATUSES.includes(order.status)));
    } catch (loadError) {
      console.error('Error fetching restaurant deliveries:', loadError);
      setError(getApiErrorMessage(loadError, 'Không thể tải tiến độ giao hàng. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDeliveries();

      let active = true;
      const connection = createOrderStatusConnection((event) => {
        setOrders((current) =>
          current
            .map((order) =>
              order.orderId === event.orderId
                ? { ...order, status: event.newStatus }
                : order,
            )
            .filter((order) => DELIVERY_STATUSES.includes(order.status)),
        );
      });

      const startAttempt = connection.start().catch((connectionError) => {
        if (active) {
          console.warn('Order realtime connection failed:', connectionError);
        }
      });

      return () => {
        active = false;
        stopAfterStart(connection, startAttempt);
      };
    }, [loadDeliveries]),
  );

  const filteredOrders = useMemo(() => {
    if (filter === 'active') {
      return orders.filter((order) =>
        ['confirmed', 'batched', 'picked_up', 'at_hub'].includes(order.status),
      );
    }
    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

  const renderOrder = ({ item }: { item: OrderListItemDto }) => {
    const orderId = getOrderId(item);
    const deliveryStatus = DELIVERY_STATUS[
      item.status as keyof typeof DELIVERY_STATUS
    ];

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderTitleRow}>
            <View style={styles.orderIcon}>
              <Ionicons name="cube-outline" size={18} color={Colors.primaryText} />
            </View>
            <View style={styles.orderTitleText}>
              <Text style={styles.orderCode} numberOfLines={1}>
                Đơn #{orderId ? orderId.slice(0, 8).toUpperCase() : 'N/A'}
              </Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${deliveryStatus.color}12`,
                borderColor: `${deliveryStatus.color}35`,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: deliveryStatus.color }]}>
              {deliveryStatus.label}
            </Text>
          </View>
        </View>

        <DeliveryProgress step={deliveryStatus.step} />

        {item.scheduledFor ? (
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primaryText} />
            <Text style={styles.scheduleText}>
              Dự kiến giao: {formatDate(item.scheduledFor)}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.itemCountRow}>
            <Ionicons name="layers-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.itemCount}>{item.itemCount ?? 0} sản phẩm</Text>
          </View>
          <Text style={styles.totalAmount}>
            {(item.totalAmount || 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <View style={styles.detailLink}>
          <Text style={styles.detailLinkText}>Xem chi tiết</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.primaryText} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.shortcutRow}>
        <Pressable
          style={styles.shortcutCard}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <View style={styles.shortcutIcon}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primaryText} />
          </View>
          <View style={styles.shortcutText}>
            <Text style={styles.shortcutTitle}>Tất cả đơn</Text>
            <Text style={styles.shortcutSubtitle}>Bản nháp, đã giao, đã hủy</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
        </Pressable>
        <Pressable
          style={styles.shortcutCard}
          onPress={() => navigation.navigate('ManageRecurringOrders')}
        >
          <View style={styles.shortcutIcon}>
            <Ionicons name="repeat-outline" size={20} color={Colors.primaryText} />
          </View>
          <View style={styles.shortcutText}>
            <Text style={styles.shortcutTitle}>Đặt định kỳ</Text>
            <Text style={styles.shortcutSubtitle}>Quản lý lịch tạo đơn</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.filterBar}>
        {FILTERS.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.helperText}>Đang tải tiến độ giao hàng...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.outline} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadDeliveries()}>
            <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, index) => getOrderId(item) || `delivery-${index}`}
          renderItem={renderOrder}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDeliveries(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="car-outline" size={56} color={Colors.outline} />
              <Text style={styles.emptyTitle}>Chưa có đơn trong mục này</Text>
              <Text style={styles.helperText}>
                Tiến độ sẽ được cập nhật khi đơn hàng chuyển sang bước tiếp theo.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
  },
  shortcutRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  shortcutCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  shortcutText: { flex: 1 },
  shortcutTitle: { fontSize: 13, color: Colors.deepTeal, fontWeight: '700' },
  shortcutSubtitle: { marginTop: 2, fontSize: 10, color: Colors.textMuted },
  filterButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  filterButtonActive: {
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.primaryText,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingTop: 10,
    gap: 12,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    padding: 14,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  orderTitleText: {
    flex: 1,
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  orderDate: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusBadge: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    top: 9,
    right: '50%',
    width: '100%',
    height: 2,
    backgroundColor: Colors.outlineVariant,
  },
  progressLineCompleted: {
    backgroundColor: Colors.primary,
  },
  progressDot: {
    zIndex: 1,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  progressDotCompleted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  progressLabel: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  progressLabelCompleted: {
    color: Colors.primaryText,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: Colors.primaryLight,
  },
  scheduleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
  },
  itemCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryText,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 10,
  },
  detailLinkText: { fontSize: 11, color: Colors.primaryText, fontWeight: '700' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  helperText: {
    maxWidth: 300,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: Colors.textMuted,
  },
  errorText: {
    maxWidth: 300,
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.error,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: Colors.primary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});
