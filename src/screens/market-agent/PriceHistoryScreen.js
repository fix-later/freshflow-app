import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { pricingService } from '../../services/pricingService';
import dayjs from 'dayjs';

export default function PriceHistoryScreen({ route }) {
  const { market, product } = route.params;
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await pricingService.getPriceHistory(market.id, product.productId, { pageSize: 50 });
        setHistory(res.data);
      } catch (err) {
        console.warn('fetchPriceHistory error', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const renderItem = ({ item, index }) => {
    const prev = history[index + 1];
    const change = prev ? ((item.price - prev.price) / prev.price) * 100 : null;
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.price}>{item.price?.toLocaleString('vi-VN')} ₫</Text>
          <Text style={styles.qty}>SL: {item.quantity}</Text>
        </View>
        <View style={styles.rowRight}>
          {change !== null && (
            <Text style={[styles.change, { color: change >= 0 ? '#ef4444' : '#16a34a' }]}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
            </Text>
          )}
          <Text style={styles.time}>{dayjs(item.recordedAt).format('DD/MM HH:mm')}</Text>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>{product.productName}</Text>
        <Text style={styles.headerSub}>{market.name}</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có lịch sử giá</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 1,
  },
  rowLeft: {},
  price: { fontSize: 15, fontWeight: '700', color: '#111827' },
  qty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  change: { fontSize: 13, fontWeight: '600' },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
