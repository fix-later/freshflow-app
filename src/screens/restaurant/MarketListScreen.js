import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { pricingService } from '../../services/pricingService';
import { usePricingStore } from '../../store/pricingStore';

export default function MarketListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const markets = usePricingStore((s) => s.markets);
  const setMarkets = usePricingStore((s) => s.setMarkets);

  const fetchMarkets = async () => {
    try {
      const data = await pricingService.getMarkets();
      setMarkets(data);
    } catch (err) {
      console.warn('fetchMarkets error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMarkets(); }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductList', { market: item })}
    >
      <Text style={styles.marketName}>{item.name}</Text>
      <Text style={styles.marketAddress} numberOfLines={1}>{item.address}</Text>
      <Text style={styles.arrow}>›</Text>
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
      <FlatList
        data={markets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMarkets(); }}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Không có chợ nào</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  marketAddress: { flex: 2, fontSize: 13, color: '#6b7280', marginHorizontal: 8 },
  arrow: { fontSize: 20, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
