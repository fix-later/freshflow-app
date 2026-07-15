import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import { creditApi, type CreditDto } from '../api/creditApi';
import { restaurantApi } from '../../restaurant/api/restaurantApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RestaurantProfileStackParamList>;

function formatVnd(amount: number | undefined | null) {
  return (amount ?? 0).toLocaleString('vi-VN') + 'đ';
}

function UsageBar({ used, limit }: { used: number | undefined | null; limit: number | undefined | null }) {
  const safeUsed = used ?? 0;
  const safeLimit = limit ?? 0;
  const ratio = safeLimit > 0 ? Math.min(safeUsed / safeLimit, 1) : 0;
  const pct = Math.round(ratio * 100);
  const barColor = ratio >= 0.9 ? Colors.danger : ratio >= 0.7 ? Colors.warning : Colors.primary;
  const labelColor = ratio >= 0.9 ? Colors.danger : ratio >= 0.7 ? Colors.warning : Colors.primaryText;
  return (
    <View style={bar.wrap}>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={[bar.label, { color: labelColor }]}>{pct}% đã sử dụng</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  wrap: { gap: 6, marginTop: 12 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

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
    <View style={stat.card}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={stat.label}>{label}</Text>
      <Text style={[stat.value, { color }]}>{value}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  label: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  value: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
});

function NavRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.navRowLeft}>
        <View style={styles.navIcon}>
          <Ionicons name={icon} size={20} color={Colors.primaryText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.navLabel}>{label}</Text>
          <Text style={styles.navSub}>{sub}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export function CreditOverviewScreen() {
  const navigation = useNavigation<Nav>();
  const [credit, setCredit] = useState<CreditDto | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const status = await restaurantApi.getApprovalStatus();
      const rid = status.restaurantId;
      setRestaurantId(rid);
      const c = await creditApi.getCredit(rid);
      console.log('[CreditOverview] API response:', JSON.stringify(c));
      setCredit(c);
    } catch {
      setError('Không thể tải thông tin tín dụng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

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

  if (error || !credit || !restaurantId) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tải được dữ liệu'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Credit limit card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Hạn mức tín dụng</Text>
          <Text style={styles.heroLimit}>{formatVnd(credit.creditLimit)}</Text>
          <UsageBar used={credit.outstandingBalance} limit={credit.creditLimit} />
        </View>

        {/* ── Stat grid ── */}
        <View style={styles.statRow}>
          <StatCard
            icon="wallet-outline"
            label="Khả dụng"
            value={formatVnd(credit.availableCredit)}
            color={Colors.primaryText}
          />
          <StatCard
            icon="receipt-outline"
            label="Đã dùng"
            value={formatVnd(credit.outstandingBalance)}
            color={Colors.danger}
          />
        </View>

        {/* ── Quick navigation ── */}
        <Text style={styles.sectionTitle}>Chi tiết</Text>
        <View style={styles.card}>
          <NavRow
            icon="list-outline"
            label="Lịch sử giao dịch"
            sub="Xem các khoản tín dụng đã sử dụng"
            onPress={() => navigation.navigate('CreditTransactions', { restaurantId })}
          />
          <View style={styles.separator} />
          <NavRow
            icon="document-text-outline"
            label="Sao kê tín dụng"
            sub="Xem và tạo sao kê hàng tháng"
            onPress={() => navigation.navigate('CreditStatements', { restaurantId })}
          />
        </View>

        {/* ── Info note ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Hạn mức tín dụng được cấp bởi FreshFlow. Liên hệ hỗ trợ để điều chỉnh hạn mức.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16, gap: 12 },
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

  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 22,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroLimit: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.onPrimary,
    marginTop: 4,
  },

  statRow: { flexDirection: 'row', gap: 10 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 0,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginHorizontal: 16 },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  navSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.secondary, lineHeight: 17 },
});
