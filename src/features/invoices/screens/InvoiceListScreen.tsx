import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  invoiceApi,
  INVOICE_STATUS_LABEL,
  type InvoiceSummaryDto,
  type InvoiceStatus,
} from '../api/invoiceApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'Invoices'>;

const PAGE_SIZE = 20;

type StatusFilter = InvoiceStatus | 'all';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Issued', label: 'Đã phát hành' },
  { id: 'PendingIssuance', label: 'Chờ phát hành' },
  { id: 'Failed', label: 'Thất bại' },
];

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  Draft: Colors.textMuted,
  PendingIssuance: Colors.warning,
  Issued: Colors.success,
  Failed: Colors.danger,
  Adjusted: Colors.textMuted,
  Cancelled: Colors.danger,
};

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InvoiceCard({ item, onPress }: { item: InvoiceSummaryDto; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.invoiceNumber}>{item.number ?? 'Chưa cấp số'}</Text>
          <Text style={styles.createdAt}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
            {INVOICE_STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Tổng tiền</Text>
        <Text style={styles.totalValue}>{formatVnd(item.total)}</Text>
      </View>
    </Pressable>
  );
}

export function InvoiceListScreen({ navigation }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [items, setItems] = useState<InvoiceSummaryDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await invoiceApi.getInvoices({
        page: 1,
        pageSize: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setItems(res.items);
      setTotal(res.total);
      setPage(1);
      setError(null);
    } catch {
      setError('Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleSelectStatus = (status: StatusFilter) => {
    if (status === statusFilter) return;
    setStatusFilter(status);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const nextPage = page + 1;
      const res = await invoiceApi.getInvoices({
        page: nextPage,
        pageSize: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setItems((current) => {
        const existingIds = new Set(current.map((i) => i.id));
        return [...current, ...res.items.filter((i) => !existingIds.has(i.id))];
      });
      setPage(nextPage);
      setTotal(res.total);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, loadingMore, page, statusFilter, total]);

  const filterRow = (
    <View style={styles.filterRow}>
      {STATUS_FILTERS.map((f) => {
        const active = f.id === statusFilter;
        return (
          <Pressable
            key={f.id}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => handleSelectStatus(f.id)}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        {filterRow}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        {filterRow}
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {filterRow}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InvoiceCard
            item={item}
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={52} color={Colors.outline} />
            <Text style={styles.emptyTitle}>
              {statusFilter === 'all' ? 'Chưa có hóa đơn' : 'Không có hóa đơn nào ở trạng thái này'}
            </Text>
            <Text style={styles.emptySub}>
              Hóa đơn VAT sẽ tự động phát hành sau khi đơn hàng được giao thành công.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : loadMoreError ? (
            <Pressable style={styles.footer} onPress={() => void loadMore()}>
              <Text style={styles.loadMoreError}>Không tải được trang tiếp theo · Thử lại</Text>
            </Pressable>
          ) : null
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.25}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.textMuted },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  list: { padding: 16, gap: 12 },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.onPrimary },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flex: 1, gap: 2 },
  invoiceNumber: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  createdAt: { fontSize: 11, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 12, color: Colors.textMuted },
  totalValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  footer: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadMoreError: { fontSize: 12, color: Colors.error, textAlign: 'center' },
});
