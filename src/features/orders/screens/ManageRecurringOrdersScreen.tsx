import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import { orderApi, type ScheduledOrderDto } from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RestaurantOrdersStackParamList, 'ManageRecurringOrders'>;

const RECURRENCE_LABEL: Record<string, string> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
};

const PAGE_SIZE = 20;

function formatDateTime(iso: string | null): string {
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

export function ManageRecurringOrdersScreen() {
  const navigation = useNavigation<Nav>();

  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [items, setItems] = useState<ScheduledOrderDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable style={styles.headerAddBtn} onPress={() => navigation.navigate('CreateRecurringOrder')}>
          <Ionicons name="add" size={24} color={Colors.primaryText} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const fetchOrders = useCallback(
    async (targetPage: number, resetList: boolean) => {
      setError(null);
      try {
        const response = await orderApi.listScheduledOrders({
          includeCancelled,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (resetList ? response.data : [...prev, ...response.data]));
        setPage(response.meta.page);
        setTotalPages(Math.max(1, Math.ceil(response.meta.total / response.meta.pageSize)));
      } catch {
        setError('Không thể tải danh sách lịch đặt hàng định kỳ.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [includeCancelled],
  );

  useEffect(() => {
    setLoading(true);
    fetchOrders(1, true);
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && !loading && page < totalPages) {
      setLoadingMore(true);
      fetchOrders(page + 1, false);
    }
  };

  const performCancel = async (scheduledOrderId: string) => {
    setCancellingId(scheduledOrderId);
    try {
      const updated = await orderApi.cancelScheduledOrder(scheduledOrderId);
      setItems((prev) => prev.map((it) => (it.scheduledOrderId === scheduledOrderId ? updated : it)));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Không thể hủy lịch', message ?? 'Vui lòng thử lại sau.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancel = (scheduledOrderId: string) => {
    Alert.alert(
      'Hủy lịch đặt hàng',
      'Hủy lịch này sẽ dừng việc tự động tạo đơn hàng theo chu kỳ. Bạn có chắc chắn?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy lịch', style: 'destructive', onPress: () => performCancel(scheduledOrderId) },
      ],
    );
  };

  const renderItem = ({ item }: { item: ScheduledOrderDto }) => {
    const isCancelled = !!item.cancelledAt;
    const isCancelling = cancellingId === item.scheduledOrderId;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="repeat-outline" size={16} color={Colors.primaryText} />
            <Text style={styles.recurrenceLabel}>
              {RECURRENCE_LABEL[item.recurrenceType] ?? item.recurrenceType}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: (isCancelled ? Colors.error : Colors.success) + '12', borderColor: (isCancelled ? Colors.error : Colors.success) + '30' },
            ]}
          >
            <Text style={[styles.badgeText, { color: isCancelled ? Colors.error : Colors.success }]}>
              {isCancelled ? 'Đã hủy' : 'Đang hoạt động'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="play-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.metaText}>Bắt đầu: {formatDateTime(item.firstRunAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.metaText}>
            Lần chạy gần nhất: {item.lastExecutedAt ? formatDateTime(item.lastExecutedAt) : 'Chưa chạy lần nào'}
          </Text>
        </View>
        {item.notes ? (
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={2}>{item.notes}</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.instancesBtn}
          onPress={() => navigation.navigate('ScheduledOrderInstances', {
            scheduledOrderId: item.scheduledOrderId,
          })}
        >
          <Ionicons name="list-outline" size={15} color={Colors.primaryText} />
          <Text style={styles.instancesBtnText}>Xem các đơn đã tạo</Text>
          <Ionicons name="chevron-forward" size={15} color={Colors.primaryText} />
        </Pressable>

        {!isCancelled ? (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreateRecurringOrder', { scheduledOrderId: item.scheduledOrderId })}
              disabled={isCancelling}
            >
              <Ionicons name="create-outline" size={15} color={Colors.primaryText} />
              <Text style={styles.editBtnText}>Sửa</Text>
            </Pressable>
            <Pressable
              style={[styles.cancelBtn, isCancelling && styles.cancelBtnDisabled]}
              onPress={() => handleCancel(item.scheduledOrderId)}
              disabled={isCancelling}
            >
              {isCancelling
                ? <ActivityIndicator size="small" color={Colors.error} />
                : (
                  <>
                    <Ionicons name="close-circle-outline" size={15} color={Colors.error} />
                    <Text style={styles.cancelBtnText}>Hủy lịch</Text>
                  </>
                )
              }
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Hiện cả lịch đã hủy</Text>
        <Switch
          value={includeCancelled}
          onValueChange={setIncludeCancelled}
          trackColor={{ true: Colors.primary }}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrders(1, true); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.scheduledOrderId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="repeat-outline" size={60} color={Colors.outline} />
              <Text style={styles.emptyTitle}>Chưa có lịch đặt hàng định kỳ</Text>
              <Text style={styles.emptySub}>Bấm nút + ở trên để tạo lịch tự động sinh bản nháp mới.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  headerAddBtn: { padding: 4, marginRight: 4 },
  instancesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  instancesBtnText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.primaryText },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  filterLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

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

  listContainer: { padding: 16, gap: 12, paddingBottom: 40 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.outline, textAlign: 'center', lineHeight: 18 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recurrenceLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { flex: 1, fontSize: 12, color: Colors.textMuted },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primaryText },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: Colors.error },
});
