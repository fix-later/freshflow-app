import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import {
  orderApi,
  type OrderListItemDto,
  type OrderStatus,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
} from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type HistoryNav = NativeStackNavigationProp<RestaurantOrdersStackParamList, 'OrderHistory'>;

type DateRangeOption = 'all' | 'today' | '7days' | 'month';

const DATE_RANGE_CHIPS: { key: DateRangeOption; label: string }[] = [
  { key: 'all', label: 'Tất cả thời gian' },
  { key: 'today', label: 'Hôm nay' },
  { key: '7days', label: '7 ngày qua' },
  { key: 'month', label: 'Tháng này' },
];

const STATUS_CHIPS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'Tất cả trạng thái' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'in_transit', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'cancelled', label: 'Đã huỷ' },
];

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getSevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export function OrderHistoryScreen() {
  const navigation = useNavigation<HistoryNav>();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);

  // Update header navigation option with date selector icon
  useEffect(() => {
    const hasActiveFilter = dateRange !== 'all';

    navigation.setOptions({
      headerRight: () => (
        <Pressable
          style={styles.headerFilterIconBtn}
          onPress={() => setIsDateModalVisible(true)}
        >
          <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
          {hasActiveFilter && <View style={styles.activeFilterDot} />}
        </Pressable>
      ),
    });
  }, [navigation, dateRange]);

  // List data state
  const [orders, setOrders] = useState<OrderListItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (resetList = false, showSpinner = false, cursorOverride?: string | null) => {
      if (showSpinner) setLoading(true);
      try {
        const currentCursor = resetList ? undefined : ((cursorOverride !== undefined ? cursorOverride : nextCursor) || undefined);

        let fromDate: string | undefined = undefined;
        if (dateRange === 'today') fromDate = getStartOfToday();
        else if (dateRange === '7days') fromDate = getSevenDaysAgo();
        else if (dateRange === 'month') fromDate = getStartOfMonth();

        const response = await orderApi.list({
          status: statusFilter === 'all' ? undefined : statusFilter,
          from: fromDate,
          cursor: currentCursor,
          pageSize: 15,
        });

        if (resetList) {
          setOrders(response.data);
        } else {
          setOrders((prev) => [...prev, ...response.data]);
        }
        setNextCursor(response.meta.nextCursor);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, dateRange],
  );

  // Trigger reload when filters change
  useEffect(() => {
    setNextCursor(null);
    fetchOrders(true, true, null);
  }, [statusFilter, dateRange, fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    setNextCursor(null);
    fetchOrders(true, false);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore && !loading) {
      setLoadingMore(true);
      fetchOrders(false, false, nextCursor);
    }
  };

  const performReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const newOrder = await orderApi.reorder(orderId);
      Alert.alert('Đã tạo đơn mới', 'Đơn hàng mới đã được tạo từ đơn này.', [
        { text: 'Xem đơn mới', onPress: () => navigation.navigate('OrderDetail', { orderId: newOrder.orderId }) },
      ]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Không thể đặt lại đơn', message ?? 'Đơn hàng này hiện không thể đặt lại.');
    } finally {
      setReorderingId(null);
    }
  };

  const handleReorder = (orderId: string) => {
    Alert.alert(
      'Đặt lại đơn hàng',
      'Tạo một đơn hàng mới với các sản phẩm giống đơn này?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Đặt lại', onPress: () => performReorder(orderId) },
      ],
    );
  };

  const renderItem = ({ item }: { item: OrderListItemDto }) => {
    const statusLabel = ORDER_STATUS_LABEL[item.status] || item.status;
    const statusColor = ORDER_STATUS_COLOR[item.status] || Colors.outline;
    const dateObj = item.createdAt ? new Date(item.createdAt) : new Date();
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(
      dateObj.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${dateObj.getFullYear()} • ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const orderId = item.orderId || item.id || '';
    const isReordering = reorderingId === orderId;
    const canReorder = item.status === 'delivered';

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId })}
      >
        {/* Left status color accent bar */}
        <View style={[styles.statusAccentBar, { backgroundColor: statusColor }]} />

        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="receipt-outline" size={16} color={Colors.primary} style={styles.receiptIcon} />
            <Text style={styles.orderCode}>Đơn #{orderId ? orderId.slice(0, 8).toUpperCase() : 'N/A'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '12', borderColor: statusColor + '25' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Date / Time and Schedule Row */}
        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>
          {item.scheduledFor ? (
            <View style={[styles.metaRow, styles.scheduledMetaRow]}>
              <Ionicons name="calendar-outline" size={12} color={Colors.primary} />
              <Text style={styles.scheduledMetaText}>
                Hẹn giao: {new Date(item.scheduledFor).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardDivider} />

        {/* Footer Row */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.itemCountText}>{item.itemCount ?? 0} sản phẩm</Text>
          </View>
          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalAmount}>{(item.totalAmount || 0).toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {canReorder ? (
          <Pressable
            style={[styles.reorderBtn, isReordering && styles.reorderBtnDisabled]}
            onPress={() => handleReorder(orderId)}
            disabled={isReordering}
          >
            {isReordering ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="repeat-outline" size={14} color={Colors.primary} />
                <Text style={styles.reorderBtnText}>Đặt lại đơn này</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {/* ─── STATUS TAB BAR (SHOPEE STYLE) ─────────────────── */}
      <View style={styles.statusTabBarContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_CHIPS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.statusTabRow}
          renderItem={({ item }) => {
            const active = statusFilter === item.key;
            return (
              <Pressable
                style={[styles.statusTab, active && styles.statusTabActive]}
                onPress={() => setStatusFilter(item.key)}
              >
                <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>
                  {item.label}
                </Text>
                {active && <View style={styles.statusTabIndicator} />}
              </Pressable>
            );
          }}
        />
      </View>

      {/* ─── DATE PICKER MODAL (BOTTOM SHEET STYLE) ───────── */}
      <Modal
        visible={isDateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDateModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDateModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chọn khoảng thời gian</Text>
                  <Pressable onPress={() => setIsDateModalVisible(false)}>
                    <Ionicons name="close" size={22} color={Colors.outline} />
                  </Pressable>
                </View>

                <View style={styles.modalList}>
                  {DATE_RANGE_CHIPS.map((chip) => {
                    const active = dateRange === chip.key;
                    return (
                      <Pressable
                        key={chip.key}
                        style={[styles.modalItem, active && styles.modalItemActive]}
                        onPress={() => {
                          setDateRange(chip.key);
                          setIsDateModalVisible(false);
                        }}
                      >
                        <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>
                          {chip.label}
                        </Text>
                        {active && (
                          <Ionicons name="checkmark-sharp" size={18} color={Colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── LIST OR LOADING ─────────────────── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách đơn...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.orderId || item.id || `order-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
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
              <Ionicons name="document-text-outline" size={60} color={Colors.outline} />
              <Text style={styles.emptyTitle}>Không tìm thấy đơn hàng</Text>
              <Text style={styles.emptySub}>Bạn chưa đặt đơn hàng nào khớp với bộ lọc hiện tại.</Text>
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
  statusTabBarContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  statusTabRow: {
    paddingHorizontal: 8,
  },
  statusTab: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusTabActive: {},
  statusTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  statusTabTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  statusTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  headerFilterIconBtn: {
    padding: 8,
    position: 'relative',
    marginRight: 4,
  },
  activeFilterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalList: {
    gap: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
  },
  modalItemActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  modalItemTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.outline,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Item Card
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statusAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptIcon: {
    marginTop: 1,
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scheduledMetaRow: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  scheduledMetaText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.surfaceVariant,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  totalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primaryLight,
  },
  reorderBtnDisabled: {
    opacity: 0.6,
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
