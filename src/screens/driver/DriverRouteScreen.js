import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { logisticsService } from '../../services/logisticsService';

export default function DriverRouteScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState([]);

  const fetchRoutes = async () => {
    try {
      const data = await logisticsService.getDriverRoutesToday();
      setRoutes(Array.isArray(data) ? data : [data]);
    } catch (err) {
      console.warn('fetchDriverRoutes error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const renderStop = ({ item, index }) => (
    <TouchableOpacity
      style={styles.stopCard}
      onPress={() => navigation.navigate('DeliveryStop', { stop: item, route: routes[0] })}
    >
      <View style={styles.stopIndex}>
        <Text style={styles.stopIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={styles.stopType}>{STOP_TYPE_LABELS[item.entityType] ?? item.entityType}</Text>
        <Text style={styles.stopName}>{item.entityName}</Text>
        <Text style={styles.stopTime}>
          Dự kiến: {item.estimatedArrivalAt
            ? new Date(item.estimatedArrivalAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '--:--'}
        </Text>
      </View>
      <View style={[styles.stopStatus, { backgroundColor: STOP_STATUS_COLOR[item.status] + '20' }]}>
        <Text style={[styles.stopStatusText, { color: STOP_STATUS_COLOR[item.status] }]}>
          {STOP_STATUS_LABELS[item.status] ?? 'Chờ'}
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

  const todayRoute = routes[0];

  return (
    <View style={styles.container}>
      {todayRoute && (
        <View style={styles.routeSummary}>
          <Text style={styles.routeTitle}>Lộ trình hôm nay</Text>
          <Text style={styles.routeMeta}>
            {todayRoute.totalDistanceKm?.toFixed(1)} km · {todayRoute.estimatedDurationMinutes} phút
          </Text>
        </View>
      )}
      <FlatList
        data={todayRoute?.stops ?? []}
        keyExtractor={(item, i) => `${item.entityId}-${i}`}
        renderItem={renderStop}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoutes(); }} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Không có lộ trình nào hôm nay</Text>
        }
      />
    </View>
  );
}

const STOP_TYPE_LABELS = { market: 'Chợ', hub: 'Hub', restaurant: 'Nhà hàng' };
const STOP_STATUS_LABELS = { pending: 'Chờ', arrived: 'Đã đến', delivered: 'Đã giao', failed: 'Thất bại' };
const STOP_STATUS_COLOR = { pending: '#f59e0b', arrived: '#3b82f6', delivered: '#16a34a', failed: '#ef4444' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  routeSummary: {
    backgroundColor: '#15803d',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  routeMeta: { fontSize: 13, color: '#bbf7d0' },
  list: { padding: 16, gap: 10 },
  stopCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    elevation: 2,
    gap: 12,
  },
  stopIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIndexText: { fontSize: 14, fontWeight: '700', color: '#15803d' },
  stopInfo: { flex: 1 },
  stopType: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  stopName: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },
  stopTime: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  stopStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stopStatusText: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
