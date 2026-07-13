import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { creditApi, type CreditStatementDto } from '../api/creditApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'CreditStatements'>;

const MONTH_VI = [
  '', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function StatementCard({ item }: { item: CreditStatementDto }) {
  const isClosed = item.status === 'closed';
  const statusColor = isClosed ? Colors.primary : Colors.warning;
  const statusLabel = isClosed ? 'Đã đóng' : 'Đang mở';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardMonth}>{MONTH_VI[item.month]} {item.year}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.generatedDate}>
          {new Date(item.generatedAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>

      <View style={styles.cardDivider} />

      {/* Stats */}
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
            –{formatVnd(item.totalDebits)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Tổng đã thanh toán</Text>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            +{formatVnd(item.totalCredits)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function CreditStatementsScreen({ route }: Props) {
  const { restaurantId } = route.params;

  const [statements, setStatements] = useState<CreditStatementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await creditApi.getStatements(restaurantId);
      setStatements(Array.isArray(res) ? res : (res as any).data ?? []);
      setError(null);
    } catch {
      setError('Không thể tải danh sách sao kê');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleGenerate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    Alert.alert(
      'Tạo sao kê',
      `Tạo sao kê tín dụng cho ${MONTH_VI[month]} ${year}?`,
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
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMonth: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  generatedDate: { fontSize: 11, color: Colors.textMuted },

  cardDivider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, gap: 3 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
