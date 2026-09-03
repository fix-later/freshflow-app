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
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { Text } from '../../../components/ui/Text';
import {
  claimsApi,
  CLAIM_STATUS_COLOR,
  CLAIM_STATUS_LABEL,
  type OrderClaimDto,
} from '../api/claimsApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ClaimsList'>;

type FilterStatus = 'ALL' | 'Submitted' | 'Approved' | 'Rejected';

const STATUS_FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'Submitted', label: 'Đang chờ' },
  { id: 'Approved', label: 'Đã duyệt' },
  { id: 'Rejected', label: 'Từ chối' },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export function ClaimsListScreen({ navigation }: Props) {
  const [claims, setClaims] = useState<OrderClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');

  const fetchClaims = useCallback(async () => {
    setError(null);
    try {
      const res = await claimsApi.listClaims({ pageSize: 100 });
      setClaims(res.items);
    } catch {
      setError('Không thể tải danh sách khiếu nại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void fetchClaims();
    }, [fetchClaims]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchClaims();
  };

  const filteredClaims = claims.filter((claim) => {
    if (activeFilter === 'ALL') return true;
    return claim.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  const renderClaimItem = ({ item }: { item: OrderClaimDto }) => {
    const statusLabel = CLAIM_STATUS_LABEL[item.status] || 'Đang cập nhật';
    const statusColor = CLAIM_STATUS_COLOR[item.status] || Colors.textMuted;
    const orderCode = (item.orderId || '').slice(0, 8).toUpperCase();

    return (
      <Pressable
        style={({ pressed }) => [styles.claimCard, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.orderId })}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.orderCodeBadge}>
            <Ionicons name="receipt-outline" size={14} color={Colors.deepTeal} />
            <Text style={styles.orderCodeText}>Đơn #{orderCode}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '15', borderColor: statusColor + '30' },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Amount & Date Row */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Số tiền khiếu nại:</Text>
          <Text style={styles.amountValue}>{(item.amount ?? 0).toLocaleString('vi-VN')}đ</Text>
        </View>

        {/* Reason */}
        <View style={styles.reasonRow}>
          <Ionicons name="chatbox-ellipses-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.reasonText} numberOfLines={2}>
            Lý do: {item.reason}
          </Text>
        </View>

        {/* Decision Note if reviewed */}
        {item.decisionNote ? (
          <View
            style={[
              styles.decisionBox,
              item.status?.toLowerCase() === 'approved' ? styles.decisionApproved : styles.decisionRejected,
            ]}
          >
            <Ionicons
              name={item.status?.toLowerCase() === 'approved' ? 'checkmark-circle-outline' : 'close-circle-outline'}
              size={14}
              color={item.status?.toLowerCase() === 'approved' ? '#047857' : '#B91C1C'}
            />
            <Text
              style={[
                styles.decisionText,
                { color: item.status?.toLowerCase() === 'approved' ? '#047857' : '#B91C1C' },
              ]}
            >
              Phản hồi từ bộ phận quản lý: {item.decisionNote}
            </Text>
          </View>
        ) : null}

        {/* Footer Meta */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerTimeText}>Ngày tạo: {formatDate(item.createdAt)}</Text>
          <View style={styles.detailLink}>
            <Text style={styles.detailLinkText}>Xem đơn hàng</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {STATUS_FILTERS.map((tab) => {
          const active = activeFilter === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách khiếu nại...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); void fetchClaims(); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredClaims}
          keyExtractor={(item) => item.claimId}
          renderItem={renderClaimItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có khiếu nại nào</Text>
              <Text style={styles.emptySub}>
                Các yêu cầu khiếu nại đền bù đơn hàng của bạn sẽ hiển thị tại đây.
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
    backgroundColor: '#F8FAFC',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  claimCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderCodeText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.deepTeal,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.medium,
  },
  amountValue: {
    fontSize: 16,
    fontFamily: Fonts.monoBold,
    color: Colors.primaryText,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  decisionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  decisionApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  decisionRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  decisionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerTimeText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Fonts.medium,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.primaryText,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
});
