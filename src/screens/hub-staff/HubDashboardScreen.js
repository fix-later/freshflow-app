import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { hubService } from '../../services/hubService';

export default function HubDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingInbound, setPendingInbound] = useState([]);
  const [hubId, setHubId] = useState(null);

  const fetchData = async () => {
    try {
      const hubs = await hubService.getHubs();
      if (hubs.length > 0) {
        const hub = hubs[0];
        setHubId(hub.id);
        const inbound = await hubService.getPendingInbound(hub.id);
        setPendingInbound(Array.isArray(inbound) ? inbound : []);
      }
    } catch (err) {
      console.warn('HubDashboard fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ScanInbound', { hubId, inbound: item })}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.deliveryId}>#{item.id?.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.source}>{item.sourceMarketName ?? 'Chợ đầu mối'}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'ARRIVED' ? '#dbeafe' : '#fef9c3' }]}>
        <Text style={[styles.statusText, { color: item.status === 'ARRIVED' ? '#1d4ed8' : '#a16207' }]}>
          {item.status === 'ARRIVED' ? 'Đã đến' : 'Chờ'}
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
        <Text style={styles.headerTitle}>Hàng chờ nhận</Text>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('ScanInbound', { hubId })}
        >
          <Text style={styles.scanBtnText}>📷 Quét QR</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={pendingInbound}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Không có hàng chờ nhận</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scanBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanBtnText: { fontSize: 13, fontWeight: '600', color: '#15803d' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    elevation: 2,
  },
  cardLeft: {},
  deliveryId: { fontSize: 14, fontWeight: '600', color: '#111827' },
  source: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
