import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { pricingService } from '../../services/pricingService';
import { usePricingStore } from '../../store/pricingStore';
import { usePricingHub } from '../../hooks/usePricingHub';
import dayjs from 'dayjs';

export default function ProductListScreen({ route, navigation }) {
  const { market } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const marketProducts = usePricingStore((s) => s.marketProducts[market.id]);
  const setMarketProducts = usePricingStore((s) => s.setMarketProducts);

  // Connect to SignalR for live price updates
  usePricingHub(market.id);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await pricingService.getMarketProducts(market.id, { pageSize: 50 });
      setMarketProducts(market.id, res.data, res.meta?.nextCursor);
    } catch (err) {
      console.warn('fetchProducts error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [market.id]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('CreateOrder', { market, product: item })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.category}>{item.category}</Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.price}>
            {item.currentPrice?.toLocaleString('vi-VN')} ₫/{item.unit}
          </Text>
          <Text style={styles.quantity}>
            Còn: {item.availableQuantity ?? item.currentQuantity} {item.unit}
          </Text>
        </View>
        <Text style={styles.updatedAt}>
          {dayjs(item.updatedAt).format('HH:mm')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{market.name}</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <FlatList
        data={marketProducts?.data ?? []}
        keyExtractor={(item) => item.marketProductId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProducts(); }}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Không có sản phẩm nào</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  category: {
    fontSize: 12,
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { fontSize: 17, fontWeight: '700', color: '#15803d' },
  quantity: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  updatedAt: { fontSize: 12, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
