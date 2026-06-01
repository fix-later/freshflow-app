import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { pricingService } from '../../services/pricingService';
import { usePricingStore } from '../../store/pricingStore';
import { useAuthStore } from '../../store/authStore';
import { usePricingHub } from '../../hooks/usePricingHub';
import dayjs from 'dayjs';

export default function MarketProductsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState(null);

  const marketProducts = usePricingStore((s) => s.marketProducts[market?.id]);
  const setMarketProducts = usePricingStore((s) => s.setMarketProducts);

  // Market Agent is assigned to one market — fetch from markets list
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const markets = await pricingService.getMarkets();
        // Market Agent sees only their assigned market
        if (markets.length > 0) setMarket(markets[0]);
      } catch (err) {
        console.warn('fetchMarket error', err);
      }
    };
    fetchMarket();
  }, []);

  // Connect to pricing hub for broadcast confirmations
  usePricingHub(market?.id);

  const fetchProducts = useCallback(async () => {
    if (!market) return;
    try {
      const res = await pricingService.getMarketProducts(market.id, { pageSize: 100 });
      setMarketProducts(market.id, res.data, res.meta?.nextCursor);
    } catch (err) {
      console.warn('fetchProducts error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [market]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('UpdatePrice', { market, product: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.unit}>{item.unit}</Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.price}>
            {item.currentPrice?.toLocaleString('vi-VN')} ₫
          </Text>
          <Text style={styles.quantity}>SL: {item.currentQuantity}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.updatedAt}>
            {dayjs(item.updatedAt).format('HH:mm')}
          </Text>
          <Text style={styles.editHint}>Chỉnh sửa ›</Text>
        </View>
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
      {market && (
        <View style={styles.marketBanner}>
          <Text style={styles.marketName}>{market.name}</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      )}
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
  marketBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  marketName: { fontSize: 15, fontWeight: '600', color: '#fff', flex: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#fff' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  unit: { fontSize: 12, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { fontSize: 17, fontWeight: '700', color: '#15803d' },
  quantity: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  rightCol: { alignItems: 'flex-end' },
  updatedAt: { fontSize: 12, color: '#9ca3af' },
  editHint: { fontSize: 12, color: '#16a34a', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
