import { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  creditApi,
  getTransactionTypeColor,
  getTransactionTypeLabel,
  type CreditDto,
  type CreditTransactionDto,
} from '../api/creditApi';
import { restaurantApi } from '../../restaurant/api/restaurantApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RestaurantProfileStackParamList>;

const TRANSACTION_PAGE_SIZE = 20;

function formatVnd(amount: number | undefined | null) {
  return `${(amount ?? 0).toLocaleString('vi-VN')}đ`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  const percentage = Math.round(ratio * 100);
  const fillColor =
    ratio >= 0.9 ? Colors.danger : ratio >= 0.7 ? Colors.warning : Colors.primary;

  return (
    <View style={styles.usageWrap}>
      <View style={styles.usageTrack}>
        <View
          style={[
            styles.usageFill,
            { width: `${percentage}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      <Text style={styles.usageLabel}>{percentage}% đã sử dụng</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text numeric style={[styles.statValue, { color }]}>
        {value}
      </Text>
    </View>
  );
}

function TransactionRow({ item }: { item: CreditTransactionDto }) {
  const typeLower = (item.type || '').toLowerCase();
  const isCharge = typeLower === 'charge';
  const isAdjustment = typeLower === 'adjustment';
  const color = getTransactionTypeColor(item.type);
  const label = getTransactionTypeLabel(item.type);
  const sign = isCharge ? '−' : isAdjustment ? '' : '+';
  const detail = item.orderId
    ? `Đơn #${item.orderId.slice(0, 8).toUpperCase()}`
    : item.reference
      ? `Tham chiếu: ${item.reference}`
      : item.note;

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons
          name={isCharge ? 'remove-circle-outline' : 'add-circle-outline'}
          size={22}
          color={color}
        />
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionLabel}>{label}</Text>
        {detail ? (
          <Text style={styles.transactionDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        <Text style={styles.transactionDate}>{formatDateTime(item.createdAt)}</Text>
      </View>

      <View style={styles.transactionAmountWrap}>
        <Text numeric style={[styles.transactionAmount, { color }]}>
          {sign}{formatVnd(Math.abs(item.amount))}
        </Text>
        <Text numeric style={styles.transactionBalance}>
          Dư nợ: {formatVnd(item.balanceAfter)}
        </Text>
      </View>
    </View>
  );
}

export function CreditOverviewScreen() {
  const navigation = useNavigation<Nav>();
  const [credit, setCredit] = useState<CreditDto | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CreditTransactionDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      // The credit endpoints require restaurantId, so resolve the restaurant owned
      // by the authenticated Restaurant Manager first.
      const approval = await restaurantApi.getApprovalStatus();
      const resolvedRestaurantId = approval.restaurantId;
      const [creditResult, transactionPage] = await Promise.all([
        creditApi.getCredit(resolvedRestaurantId),
        creditApi.getTransactions(resolvedRestaurantId, {
          pageSize: TRANSACTION_PAGE_SIZE,
        }),
      ]);

      setRestaurantId(resolvedRestaurantId);
      setCredit(creditResult);
      setTransactions(transactionPage.data);
      setNextCursor(transactionPage.meta.nextCursor);
      setLoadMoreError(false);
    } catch {
      setError('Không thể tải thông tin công nợ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
    }, [loadOverview]),
  );

  const loadMoreTransactions = useCallback(async () => {
    if (!restaurantId || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const page = await creditApi.getTransactions(restaurantId, {
        cursor: nextCursor,
        pageSize: TRANSACTION_PAGE_SIZE,
      });

      setTransactions((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...page.data.filter((item) => !existingIds.has(item.id))];
      });
      setNextCursor(page.meta.nextCursor);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, restaurantId]);

  if (loading && !credit) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải công nợ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !credit || !restaurantId) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tải được dữ liệu công nợ'}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadOverview()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Hạn mức tín dụng</Text>
        <Text numeric style={styles.heroLimit}>{formatVnd(credit.creditLimit)}</Text>
        <UsageBar used={credit.outstandingBalance} limit={credit.creditLimit} />
      </View>

      <View style={styles.statRow}>
        <StatCard
          icon="wallet-outline"
          label="Hạn mức còn lại"
          value={formatVnd(credit.availableCredit)}
          color={Colors.primaryText}
        />
        <StatCard
          icon="receipt-outline"
          label="Dư nợ hiện tại"
          value={formatVnd(credit.outstandingBalance)}
          color={Colors.danger}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.statementButton, pressed && styles.pressed]}
        onPress={() => navigation.navigate('CreditStatements', { restaurantId })}
      >
        <View style={styles.statementIcon}>
          <Ionicons name="document-text-outline" size={20} color={Colors.primaryText} />
        </View>
        <View style={styles.statementText}>
          <Text style={styles.statementLabel}>Sao kê tín dụng</Text>
          <Text style={styles.statementSub}>Xem và tạo sao kê hàng tháng</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
        <Text style={styles.infoText}>
          Hạn mức tín dụng được cấp bởi FreshFlow. Liên hệ hỗ trợ để điều chỉnh hạn mức.
        </Text>
      </View>

      <View style={styles.transactionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          <Text style={styles.sectionSub}>Đơn ghi nợ và các khoản thanh toán đã ghi nhận</Text>
        </View>
        <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color={Colors.outline} />
            <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
            <Text style={styles.emptySub}>Các giao dịch tín dụng sẽ xuất hiện tại đây</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : loadMoreError ? (
            <Pressable style={styles.footer} onPress={() => void loadMoreTransactions()}>
              <Text style={styles.loadMoreError}>Không tải được trang tiếp theo · Thử lại</Text>
            </Pressable>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadOverview(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onEndReached={() => void loadMoreTransactions()}
        onEndReachedThreshold={0.25}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 24 },
  headerContent: { padding: 16, gap: 12 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 14, color: Colors.textMuted },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 280 },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },

  heroCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 22 },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroLimit: { fontSize: 32, fontWeight: '800', color: Colors.onPrimary, marginTop: 4 },
  usageWrap: { gap: 6, marginTop: 12 },
  usageTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  usageFill: { height: '100%', borderRadius: 4 },
  usageLabel: { fontSize: 12, fontWeight: '600', color: Colors.onPrimary, textAlign: 'right' },

  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', textAlign: 'center' },

  statementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    padding: 14,
  },
  statementIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementText: { flex: 1 },
  statementLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  statementSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.secondary, lineHeight: 17 },
  transactionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  sectionSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: { flex: 1, gap: 2 },
  transactionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  transactionDetail: { fontSize: 12, color: Colors.textMuted },
  transactionDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  transactionAmountWrap: { alignItems: 'flex-end', gap: 2 },
  transactionAmount: { fontSize: 14, fontWeight: '800' },
  transactionBalance: { fontSize: 10, color: Colors.textMuted },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginHorizontal: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  footer: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadMoreError: { fontSize: 12, color: Colors.error, textAlign: 'center' },
});
