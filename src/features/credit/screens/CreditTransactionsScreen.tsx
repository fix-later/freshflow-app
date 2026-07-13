import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import {
  creditApi,
  type CreditTransactionDto,
  TRANSACTION_TYPE_LABEL,
  TRANSACTION_TYPE_COLOR,
} from '../api/creditApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'CreditTransactions'>;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()} • ${d
    .getHours()
    .toString()
    .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function TransactionRow({ item }: { item: CreditTransactionDto }) {
  const isDebit = item.type === 'debit' || item.amount < 0;
  const color = TRANSACTION_TYPE_COLOR[item.type] ?? Colors.textMuted;
  const label = TRANSACTION_TYPE_LABEL[item.type] ?? item.type;
  const sign = isDebit ? '–' : '+';
  const amountColor = isDebit ? Colors.danger : Colors.primary;

  return (
    <View style={styles.row}>
      <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
        <Ionicons
          name={isDebit ? 'remove-circle-outline' : 'add-circle-outline'}
          size={22}
          color={color}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {item.orderId ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            Đơn #{item.orderId.slice(0, 8).toUpperCase()}
          </Text>
        ) : item.note ? (
          <Text style={styles.rowSub} numberOfLines={1}>{item.note}</Text>
        ) : null}
        <Text style={styles.rowDate}>{formatDateTime(item.createdAt)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: amountColor }]}>
          {sign}{formatVnd(Math.abs(item.amount))}
        </Text>
        <Text style={styles.rowBalance}>Số dư: {formatVnd(item.balanceAfter)}</Text>
      </View>
    </View>
  );
}

export function CreditTransactionsScreen({ route }: Props) {
  const { restaurantId } = route.params;

  const [transactions, setTransactions] = useState<CreditTransactionDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (reset = false, cursorOverride?: string | null) => {
      try {
        const cursor = reset ? undefined : (cursorOverride !== undefined ? cursorOverride : nextCursor) ?? undefined;
        const res = await creditApi.getTransactions(restaurantId, { cursor, pageSize: 20 });
        if (reset) {
          setTransactions(res.data);
        } else {
          setTransactions((prev) => [...prev, ...res.data]);
        }
        setNextCursor(res.meta.nextCursor);
        setError(null);
      } catch {
        setError('Không thể tải lịch sử giao dịch');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [restaurantId],
  );

  useEffect(() => {
    fetch(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setNextCursor(null);
    fetch(true, null);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore && !loading) {
      setLoadingMore(true);
      fetch(false, nextCursor);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
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
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetch(true); }}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.25}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={52} color={Colors.outline} />
            <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
            <Text style={styles.emptySub}>Các giao dịch tín dụng sẽ xuất hiện ở đây</Text>
          </View>
        }
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

  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginHorizontal: 16 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textMuted },
  rowDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowAmount: { fontSize: 15, fontWeight: '800' },
  rowBalance: { fontSize: 11, color: Colors.textMuted },

  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
