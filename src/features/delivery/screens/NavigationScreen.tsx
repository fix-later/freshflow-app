import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { GoongMap } from '../../../components/GoongMap';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_STOP_MAP, type StopStatus } from '../mockData';
import { stopStatusStore, updateStopStatus } from '../stopStatusStore';

type Props = NativeStackScreenProps<DriverStackParamList, 'DriverNavigation'>;

export function NavigationScreen({ route, navigation }: Props) {
  const stop = MOCK_STOP_MAP[route.params.stopId];
  // TODO: replace with API call: await driverApi.getStop(route.params.stopId)

  const [localStatus, setLocalStatus] = useState<StopStatus>(stop?.status ?? 'pending');
  const [currentLat, setCurrentLat] = useState<number | undefined>(undefined);
  const [currentLng, setCurrentLng] = useState<number | undefined>(undefined);

  // Sync status from shared store when returning from ProofOfDelivery
  useFocusEffect(
    useCallback(() => {
      if (stop) setLocalStatus(stopStatusStore[stop.id] ?? stop.status);
    }, [stop]),
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLat(pos.coords.latitude);
      setCurrentLng(pos.coords.longitude);
    })();
  }, []);

  if (!stop) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Không tìm thấy điểm giao hàng</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenMaps = () => {
    const url = `https://maps.google.com/?q=${stop.lat},${stop.lng}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Lỗi', 'Không thể mở bản đồ'),
    );
  };

  const handleCall = () => {
    Linking.openURL(`tel:${stop.contactPhone}`);
  };

  const handleArrived = () => {
    updateStopStatus(stop.id, 'arrived');
    setLocalStatus('arrived');
  };

  const handleDelivered = () => {
    navigation.navigate('ProofOfDelivery', { stopId: stop.id });
  };

  const handleFailed = () => {
    navigation.navigate('ReportDeliveryIssue', { stopId: stop.id });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Goong Map ── */}
        <GoongMap
          destLat={stop.lat}
          destLng={stop.lng}
          currentLat={currentLat}
          currentLng={currentLng}
        />
        <Pressable style={styles.openMapBtn} onPress={handleOpenMaps}>
          <Ionicons name="navigate" size={14} color={Colors.onPrimary} />
          <Text style={styles.openMapBtnText}>Mở Google Maps</Text>
        </Pressable>

        {/* ── Stop info ── */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.stopNumBadge}>
              <Text style={styles.stopNumText}>#{stop.order}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName}>{stop.restaurantName}</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.addressText}>{stop.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Contact */}
          <View style={styles.contactRow}>
            <View style={styles.contactLeft}>
              <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
              <View>
                <Text style={styles.contactName}>{stop.contactName}</Text>
                <Text style={styles.contactPhone}>{stop.contactPhone}</Text>
              </View>
            </View>
            <Pressable style={styles.callBtn} onPress={handleCall}>
              <Ionicons name="call" size={16} color={Colors.onPrimary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Items */}
          <Text style={styles.itemsLabel}>Hàng hoá cần giao</Text>
          {stop.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Ionicons name="cube-outline" size={14} color={Colors.primary} />
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
            </View>
          ))}
        </View>

        {/* ── Notes ── */}
        {stop.notes ? (
          <View style={styles.noteBox}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.noteText}>{stop.notes}</Text>
          </View>
        ) : null}

        {/* ── Actions ── */}
        <View style={styles.actionsCard}>
          {localStatus === 'pending' && (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
              onPress={handleArrived}
            >
              <Ionicons name="location" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryBtnText}>Đã tới nơi</Text>
            </Pressable>
          )}

          {localStatus === 'arrived' && (
            <>
              <Text style={styles.actionsTitle}>Bạn đã tới điểm giao. Chọn kết quả:</Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
                onPress={handleDelivered}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
                <Text style={styles.primaryBtnText}>Xác nhận đã giao</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.dangerOutlineBtn, pressed && { opacity: 0.8 }]}
                onPress={handleFailed}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                <Text style={styles.dangerOutlineBtnText}>Không giao được</Text>
              </Pressable>
            </>
          )}

          {localStatus === 'delivered' && (
            <View style={styles.resultState}>
              <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
              <Text style={styles.resultTitle}>Đã giao thành công!</Text>
              <Text style={styles.resultSub}>Điểm giao này đã hoàn thành.</Text>
              <Pressable style={styles.backToListBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backToListBtnText}>Về danh sách</Text>
              </Pressable>
            </View>
          )}

          {localStatus === 'failed' && (
            <View style={styles.resultState}>
              <Ionicons name="close-circle" size={44} color={Colors.danger} />
              <Text style={[styles.resultTitle, { color: Colors.danger }]}>Không giao được</Text>
              <Text style={styles.resultSub}>Điểm giao này đã được ghi nhận thất bại.</Text>
              <Pressable style={styles.backToListBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backToListBtnText}>Về danh sách</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center' },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  openMapBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onPrimary },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopNumBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  stopNumText: { fontSize: 12, fontWeight: '800', color: Colors.onPrimary },
  restaurantName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 3 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  addressText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },

  divider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  contactPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemsLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  itemQty: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  noteBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },

  actionsCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  actionsTitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  dangerOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
  },
  dangerOutlineBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },

  resultState: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  resultTitle: { fontSize: 17, fontWeight: '800', color: Colors.success },
  resultSub: { fontSize: 13, color: Colors.textMuted },
  backToListBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 11,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
  },
  backToListBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});
