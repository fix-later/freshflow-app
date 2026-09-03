import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorView, Loading, Text, TextInput } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import type { HubStackParamList } from '../../../navigation/types';
import {
  hubApi,
  type HubProcurementBatchDto,
  type HubProcurementOrderDto,
} from '../api/hubApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import { formatQuantityWithUnit } from '../../../utils/quantity';

type Props = NativeStackScreenProps<HubStackParamList, 'HubBatchOrders'>;

type OrderRow = {
  orderId: string;
  order: HubProcurementOrderDto | null;
};

function shortCode(prefix: string, value: string): string {
  return `${prefix}-${value.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function readErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Không thể tải danh sách đơn hàng trong lô. Vui lòng thử lại.');
}

export function HubBatchOrdersScreen({ route }: Props) {
  const { hubId, hubName, date, batchId } = route.params;
  const [batch, setBatch] = useState<HubProcurementBatchDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      setBatch(await hubApi.getProcurementBatchDetail(hubId, date, batchId));
    } catch (loadError) {
      setError(readErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hubId, date, batchId]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const rows = useMemo(() => {
    const details = new Map(batch?.orders?.map((order) => [order.orderId, order]) ?? []);
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    return (batch?.orderIds ?? [])
      .map((orderId): OrderRow => ({ orderId, order: details.get(orderId) ?? null }))
      .filter(({ orderId, order }) => {
        if (!normalizedQuery) return true;
        return shortCode('ĐH', orderId).toLocaleLowerCase('vi-VN').includes(normalizedQuery)
          || order?.restaurantName.toLocaleLowerCase('vi-VN').includes(normalizedQuery) === true;
      });
  }, [batch, query]);

  if (loading && !batch) return <Loading label="Đang tải đơn hàng trong lô..." />;
  if (error && !batch) return <ErrorView message={error} onRetry={() => void load(true)} />;
  if (!batch) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <EmptyState
          icon={<Ionicons name="archive-outline" size={48} color={Colors.textMuted} />}
          title="Không tìm thấy lô hàng"
          subtitle="Lô có thể đã được cập nhật hoặc không còn thuộc kế hoạch ngày này."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.orderId}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            colors={[Colors.primaryText]}
            tintColor={Colors.primary}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={(
          <View style={styles.headerContent}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="documents-outline" size={24} color={Colors.primaryText} />
              </View>
              <View style={styles.summaryCopy}>
                <Text numeric style={styles.batchCode}>{shortCode('LÔ', batchId)}</Text>
                <Text style={styles.hubName}>{hubName}</Text>
                <Text style={styles.dateText}>{formatDate(date)}</Text>
              </View>
              <View style={styles.orderCountBadge}>
                <Text numeric style={styles.orderCountValue}>{batch?.orderIds.length ?? 0}</Text>
                <Text style={styles.orderCountLabel}>đơn hàng</Text>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm theo mã đơn hoặc nhà hàng"
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 ? (
                <Pressable accessibilityLabel="Xóa tìm kiếm" onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.listHeading}>
              <View>
                <Text style={styles.listTitle}>Danh sách đơn hàng</Text>
                <Text style={styles.listHint}>Chạm từng đơn để xem mặt hàng và số lượng</Text>
              </View>
              <Text numeric style={styles.visibleCount}>{rows.length}/{batch?.orderIds.length ?? 0}</Text>
            </View>
            {error ? <ErrorView message={error} onRetry={() => void load(true)} /> : null}
          </View>
        )}
        ListEmptyComponent={(
          <EmptyState
            icon={<Ionicons name="search-outline" size={46} color={Colors.textMuted} />}
            title={batch?.orderIds.length ? 'Không tìm thấy đơn phù hợp' : 'Lô chưa có đơn hàng'}
            subtitle={batch?.orderIds.length
              ? 'Thử tìm bằng mã đơn hoặc tên nhà hàng khác.'
              : 'Danh sách sẽ xuất hiện khi đơn hàng được thêm vào lô.'}
          />
        )}
        renderItem={({ item, index }) => {
          const expanded = expandedOrderId === item.orderId;
          const detailAvailable = item.order !== null;
          return (
            <View style={[styles.orderCard, expanded && styles.orderCardExpanded]}>
              <Pressable
                style={styles.orderHeader}
                disabled={!detailAvailable}
                onPress={() => setExpandedOrderId(expanded ? null : item.orderId)}
              >
                <View style={styles.orderIndex}>
                  <Text numeric style={styles.orderIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.orderCopy}>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {item.order?.restaurantName ?? 'Chưa có thông tin nhà hàng'}
                  </Text>
                  <Text numeric style={styles.orderCode}>{shortCode('ĐH', item.orderId)}</Text>
                  <Text style={detailAvailable ? styles.itemCount : styles.missingDetail}>
                    {detailAvailable
                      ? `${item.order?.items.length ?? 0} mặt hàng`
                      : 'Chưa tải được chi tiết đơn này'}
                  </Text>
                </View>
                {detailAvailable ? (
                  <Ionicons
                    name={expanded ? 'chevron-up-circle' : 'chevron-down-circle'}
                    size={23}
                    color={Colors.primaryText}
                  />
                ) : (
                  <Ionicons name="alert-circle-outline" size={22} color={Colors.warning} />
                )}
              </Pressable>

              {expanded && item.order ? (
                <View style={styles.orderItems}>
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnLabel}>Mặt hàng</Text>
                    <Text style={styles.columnLabel}>Số lượng</Text>
                  </View>
                  {item.order.items.map((orderItem) => (
                    <View key={orderItem.orderItemId} style={styles.itemRow}>
                      <Text style={styles.itemName}>{orderItem.productName}</Text>
                      <Text numeric style={styles.itemQuantity}>
                        {formatQuantityWithUnit(orderItem.quantity, orderItem.unit)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerContent: { gap: 14, marginBottom: 12 },
  summaryCard: { borderRadius: 16, borderWidth: 1, borderColor: Colors.primary600, backgroundColor: Colors.primaryLight, padding: 14, flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  batchCode: { fontSize: 12, fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  hubName: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginTop: 3 },
  dateText: { fontSize: 8, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  orderCountBadge: { minWidth: 64, borderRadius: 11, backgroundColor: Colors.surface, paddingHorizontal: 9, paddingVertical: 8, alignItems: 'center' },
  orderCountValue: { fontSize: 16, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  orderCountLabel: { fontSize: 8, color: Colors.textMuted, marginTop: 2 },
  searchWrap: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 11, color: Colors.textPrimary },
  listHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  listTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  listHint: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  visibleCount: { fontSize: 10, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  separator: { height: 9 },
  orderCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  orderCardExpanded: { borderColor: Colors.primary600 },
  orderHeader: { minHeight: 70, padding: 12, flexDirection: 'row', alignItems: 'center' },
  orderIndex: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  orderIndexText: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.textSecondary },
  orderCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  restaurantName: { fontSize: 11, fontWeight: '800', color: Colors.textPrimary },
  orderCode: { fontSize: 8, fontFamily: Fonts.monoMedium, color: Colors.textSecondary, marginTop: 3 },
  itemCount: { fontSize: 8, color: Colors.primaryText, marginTop: 3 },
  missingDetail: { fontSize: 8, color: Colors.warning, marginTop: 3 },
  orderItems: { borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 12, paddingBottom: 7, backgroundColor: Colors.surfaceContainerLow },
  columnHeader: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  columnLabel: { fontSize: 8, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  itemRow: { minHeight: 42, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemName: { flex: 1, fontSize: 10, color: Colors.textPrimary },
  itemQuantity: { fontSize: 9, fontFamily: Fonts.monoSemibold, color: Colors.primaryText },
});
