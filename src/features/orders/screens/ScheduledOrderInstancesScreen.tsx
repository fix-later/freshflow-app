import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  orderApi,
  type OrderListItemDto,
} from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ScheduledOrderInstances'>;

const PAGE_SIZE = 20;

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export function ScheduledOrderInstancesScreen({ route, navigation }: Props) {
  const { scheduledOrderId } = route.params;
  const [orders, setOrders] = useState<OrderListItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (targetPage: number, resetList: boolean) => {
      setError(null);
      try {
        const response = await orderApi.listScheduledOrderInstances(scheduledOrderId, {
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setOrders((current) => (resetList ? response.data : [...current, ...response.data]));
        setPage(response.meta.page);
        setTotalPages(Math.max(1, Math.ceil(response.meta.total / response.meta.pageSize)));
      } catch {
        setError('Không thể tải các đơn đã được tạo từ lịch này.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [scheduledOrderId],
  );

  useEffect(() => {
    fetchOrders(1, true);
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && page < totalPages) {
      setLoadingMore(true);
      fetchOrders(page + 1, false);
    }
  };

  const renderOrder = ({ item }: { item: OrderListItemDto }) => {
    const statusColor = ORDER_STATUS_COLOR[item.status];
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.orderId })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="receipt-outline" size={17} color={Colors.primaryText} />
            <Text style={styles.orderCode}>
              Đơn #{item.orderId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}12` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {ORDER_STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.metaText}>Tạo lúc: {formatDateTime(item.createdAt)}</Text>
        <Text style={styles.metaText}>Hẹn giao: {formatDateTime(item.scheduledFor)}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.itemCount}>{item.itemCount} sản phẩm</Text>
          <Text style={styles.total}>{item.totalAmount.toLocaleString('vi-VN')}đ</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.helperText}>Đang tải danh sách đơn...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchOrders(1, true);
            }}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.orderId}
          renderItem={renderOrder}
          contentContainerStyle={[styles.listContent, orders.length === 0 && styles.emptyContent]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerLoader} color={Colors.primary} /> : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="file-tray-outline" size={54} color={Colors.outline} />
              <Text style={styles.emptyTitle}>Chưa có đơn nào được tạo</Text>
              <Text style={styles.helperText}>
                Đơn cụ thể sẽ xuất hiện sau khi lịch chạy đến thời điểm đã cấu hình.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, gap: 12 },
  emptyContent: { flexGrow: 1 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  orderCode: { flex: 1, fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  badge: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  metaText: { marginTop: 4, fontSize: 12, color: Colors.textMuted },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
  },
  itemCount: { fontSize: 12, color: Colors.textMuted },
  total: { fontSize: 15, fontWeight: '800', color: Colors.primaryText },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  helperText: { marginTop: 10, textAlign: 'center', color: Colors.textMuted, lineHeight: 19 },
  errorText: { marginTop: 10, textAlign: 'center', color: Colors.error },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  retryText: { color: Colors.onPrimary, fontWeight: '700' },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  footerLoader: { marginVertical: 16 },
});
