import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { creditApi, type CreditStatementSummaryDto } from '../api/creditApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'CreditStatements'>;

const STATEMENT_PAGE_SIZE = 20;

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatPeriod(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const inclusiveEnd = new Date(endDate.getTime() - 1);

  return `${startDate.toLocaleDateString('vi-VN')} – ${inclusiveEnd.toLocaleDateString('vi-VN')}`;
}

function StatementCard({ item }: { item: CreditStatementSummaryDto }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardMonth}>
            Tháng {new Date(item.periodStart).toLocaleDateString('vi-VN', {
              month: '2-digit',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.periodText}>{formatPeriod(item.periodStart, item.periodEnd)}</Text>
        </View>
        <Text style={styles.generatedDate}>
          {new Date(item.generatedAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Số dư đầu kỳ</Text>
          <Text style={styles.statValue}>{formatVnd(item.openingBalance)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Số dư cuối kỳ</Text>
          <Text style={styles.statValue}>{formatVnd(item.closingBalance)}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Tổng đã dùng</Text>
          <Text style={[styles.statValue, { color: Colors.danger }]}>
            –{formatVnd(item.totalCharges)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Tổng đã thanh toán</Text>
          <Text style={[styles.statValue, { color: Colors.primaryText }]}>
            +{formatVnd(item.totalSettlements)}
          </Text>
        </View>
      </View>
      {item.totalRefunds > 0 ? (
        <View style={styles.refundRow}>
          <Text style={styles.statLabel}>Tổng hoàn tiền</Text>
          <Text style={[styles.statValue, { color: Colors.primaryText }]}>
            +{formatVnd(item.totalRefunds)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function CreditStatementsScreen({ route }: Props) {
  const { restaurantId } = route.params;

  const [statements, setStatements] = useState<CreditStatementSummaryDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await creditApi.getStatements(restaurantId, {
        pageSize: STATEMENT_PAGE_SIZE,
      });
      setStatements(res.data);
      setNextCursor(res.meta.nextCursor);
      setLoadMoreError(false);
      setError(null);
    } catch {
      setError('Không thể tải danh sách sao kê');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const res = await creditApi.getStatements(restaurantId, {
        cursor: nextCursor,
        pageSize: STATEMENT_PAGE_SIZE,
      });
      setStatements((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...res.data.filter((item) => !existingIds.has(item.id))];
      });
      setNextCursor(res.meta.nextCursor);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, restaurantId]);

  const handleGenerate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    Alert.alert(
      'Tạo sao kê',
      `Tạo sao kê tín dụng cho tháng ${month}/${year}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Tạo sao kê',
          onPress: async () => {
            setGenerating(true);
            try {
              const newStatement = await creditApi.generateStatement(restaurantId, year, month);
              setStatements((prev) => {
                const exists = prev.findIndex((s) => s.id === newStatement.id);
                if (exists >= 0) {
                  return prev.map((s, i) => (i === exists ? newStatement : s));
                }
                return [newStatement, ...prev];
              });
            } catch (err: unknown) {
              const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
              Alert.alert('Không thể tạo sao kê', message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
            } finally {
              setGenerating(false);
            }
          },
        },
      ],
    );
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
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={statements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StatementCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          <Pressable
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.generateBtnText}>Tạo sao kê tháng này</Text>
              </>
            )}
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={52} color={Colors.outline} />
            <Text style={styles.emptyTitle}>Chưa có sao kê</Text>
            <Text style={styles.emptySub}>Nhấn "Tạo sao kê" để tạo sao kê tháng hiện tại</Text>
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

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: { flex: 1, gap: 2 },
  cardMonth: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  periodText: { fontSize: 11, color: Colors.textMuted },
  generatedDate: { fontSize: 11, color: Colors.textMuted },

  cardDivider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, gap: 3 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  footer: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadMoreError: { fontSize: 12, color: Colors.error, textAlign: 'center' },
});
