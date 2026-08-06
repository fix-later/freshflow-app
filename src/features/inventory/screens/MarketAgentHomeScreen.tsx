import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { useAuthStore } from '../../../store/authStore';
import { inventoryApi, type AssignedMarketDto } from '../api/inventoryApi';

export function MarketAgentHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [assignedMarkets, setAssignedMarkets] = useState<AssignedMarketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setAssignedMarkets(await inventoryApi.getAssignedMarkets());
    } catch (error: any) {
      Alert.alert('Không thể tải tổng quan', error?.message || 'Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void fetchOverview();
  }, [fetchOverview]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOverview();
    setRefreshing(false);
  }, [fetchOverview]);

  const openPriceUpdate = () => {
    navigation.getParent()?.navigate('UpdatePrice');
  };

  if (loading) {
    return (
      <ScreenContainer
        scroll={false}
        safeArea
        edges={['top']}
        bgColor={Colors.background}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
          <Text style={styles.loadingText}>Đang tải tổng quan...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll
      padding={false}
      safeArea
      edges={['top']}
      bgColor={Colors.background}
      style={styles.container}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primaryText]}
          tintColor={Colors.primaryText}
        />
      )}
    >
      <View style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'M'}
            </Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Market Agent'}</Text>
          </View>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>ĐANG HOẠT ĐỘNG</Text>
          </View>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>PHẠM VI VẬN HÀNH</Text>
          <Text style={styles.heroTitle}>
            {assignedMarkets.length > 0
              ? `${assignedMarkets.length} chợ đầu mối đang phụ trách`
              : 'Chưa có chợ được phân công'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {assignedMarkets.length > 0
              ? 'Theo dõi từng điểm chợ và cập nhật giá bán từ một nơi.'
              : 'Liên hệ quản trị viên để được thiết lập phạm vi làm việc.'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>THAO TÁC THƯỜNG DÙNG</Text>
            <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
          onPress={openPriceUpdate}
          accessibilityRole="button"
          accessibilityLabel="Mở màn hình cập nhật giá"
        >
          <View style={styles.primaryActionIcon}>
            <Ionicons name="pricetags-outline" size={25} color={Colors.deepTeal} />
          </View>
          <View style={styles.primaryActionCopy}>
            <Text style={styles.primaryActionTitle}>Cập nhật giá và tồn kho</Text>
            <Text style={styles.primaryActionText}>
              Chọn chợ, lọc danh mục và cập nhật trực tiếp từng mặt hàng.
            </Text>
          </View>
          <View style={styles.primaryActionArrow}>
            <Ionicons name="arrow-forward" size={18} color={Colors.primaryText} />
          </View>
        </Pressable>

        <View style={styles.scopeCard}>
          <View style={styles.scopeIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primaryText} />
          </View>
          <View style={styles.scopeCopy}>
            <Text style={styles.scopeTitle}>Phạm vi đã đồng bộ</Text>
            <Text style={styles.scopeText}>
              Danh sách dưới đây được lấy từ phân công hiện tại của hệ thống.
            </Text>
          </View>
          <Text style={styles.scopeValue} numeric>{assignedMarkets.length}</Text>
        </View>

        <View style={styles.marketSectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>ĐIỂM VẬN HÀNH</Text>
            <Text style={styles.sectionTitle}>Chợ đang phụ trách</Text>
          </View>
          <View style={styles.marketCountPill}>
            <Ionicons name="storefront-outline" size={13} color={Colors.primaryText} />
            <Text style={styles.marketCountText} numeric>{assignedMarkets.length} chợ</Text>
          </View>
        </View>

        {assignedMarkets.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="storefront-outline" size={28} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Chưa được phân công chợ</Text>
            <Text style={styles.emptyText}>
              Khi có phân công mới, thông tin chợ sẽ xuất hiện tại đây.
            </Text>
          </View>
        ) : (
          <View style={styles.marketList}>
            {assignedMarkets.map((market, index) => (
              <View key={market.marketId} style={styles.marketCard}>
                <View style={styles.marketCardHeader}>
                  <View style={styles.marketIndex}>
                    <Text style={styles.marketIndexText} numeric>{String(index + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={styles.marketCopy}>
                    <Text style={styles.marketName} numberOfLines={1}>{market.name}</Text>
                    <View style={styles.marketLocationRow}>
                      <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.marketLocation} numberOfLines={2}>
                        {market.address || market.location || 'Chưa cập nhật địa chỉ'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.assignedBadge}>
                    <View style={styles.assignedDot} />
                    <Text style={styles.assignedText}>ĐÃ PHÂN CÔNG</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.marketAction, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('MarketKiosks', {
                    marketId: market.marketId,
                    marketName: market.name,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem Kiosk liên kết tại ${market.name}`}
                >
                  <View style={styles.marketActionLeft}>
                    <Ionicons name="grid-outline" size={16} color={Colors.primaryText} />
                    <Text style={styles.marketActionText}>Xem Kiosk liên kết</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primaryText} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.medium },
  hero: {
    minHeight: 268,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    overflow: 'hidden',
    backgroundColor: Colors.deepTeal,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOrbLarge: {
    position: 'absolute',
    top: -74,
    right: -54,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(80,240,163,0.12)',
  },
  heroOrbSmall: {
    position: 'absolute',
    left: -36,
    bottom: -56,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarText: { fontSize: 16, color: Colors.deepTeal, fontFamily: Fonts.bold },
  profileCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  greeting: { fontSize: 9, color: '#BFD3D6', fontFamily: Fonts.medium },
  userName: { marginTop: 2, fontSize: 14, color: Colors.white, fontFamily: Fonts.bold },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  onlineText: { fontSize: 7, letterSpacing: 0.5, color: Colors.white, fontFamily: Fonts.bold },
  heroContent: { marginTop: 38, maxWidth: '90%' },
  heroEyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  heroTitle: { marginTop: 8, fontSize: 25, lineHeight: 32, color: Colors.white, fontFamily: Fonts.extraBold },
  heroSubtitle: { marginTop: 10, fontSize: 11, lineHeight: 18, color: '#C8DADD', fontFamily: Fonts.medium },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  sectionHeading: { marginBottom: 12 },
  sectionEyebrow: {
    marginBottom: 4,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  sectionTitle: { fontSize: 19, color: Colors.textPrimary, fontFamily: Fonts.bold },
  primaryAction: {
    minHeight: 96,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  primaryActionCopy: { flex: 1, minWidth: 0 },
  primaryActionTitle: { fontSize: 12, color: Colors.deepTeal, fontFamily: Fonts.bold },
  primaryActionText: { marginTop: 5, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  primaryActionArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  scopeCard: {
    minHeight: 72,
    marginTop: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C9F4DD',
  },
  scopeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  scopeCopy: { flex: 1, minWidth: 0 },
  scopeTitle: { fontSize: 10, color: Colors.deepTeal, fontFamily: Fonts.bold },
  scopeText: { marginTop: 3, fontSize: 8, lineHeight: 13, color: Colors.textSecondary },
  scopeValue: { fontSize: 22, color: Colors.primaryText, fontFamily: Fonts.monoBold },
  marketSectionHeading: {
    marginTop: 28,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  marketCountText: { fontSize: 9, color: Colors.primaryText, fontFamily: Fonts.bold },
  marketList: { gap: 11 },
  marketCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  marketCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  marketIndex: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.deepTeal,
  },
  marketIndexText: { fontSize: 11, color: Colors.primary, fontFamily: Fonts.monoBold },
  marketCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  marketName: { fontSize: 13, color: Colors.textPrimary, fontFamily: Fonts.bold },
  marketLocationRow: { marginTop: 5, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  marketLocation: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textMuted },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  assignedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary600 },
  assignedText: { fontSize: 6, letterSpacing: 0.4, color: Colors.primaryText, fontFamily: Fonts.bold },
  marketAction: {
    minHeight: 42,
    marginTop: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 13,
    backgroundColor: Colors.surfaceContainerLow,
  },
  marketActionLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  marketActionText: { fontSize: 10, color: Colors.primaryText, fontFamily: Fonts.bold },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  emptyTitle: { marginTop: 12, fontSize: 12, color: Colors.textPrimary, fontFamily: Fonts.bold },
  emptyText: { marginTop: 6, fontSize: 9, lineHeight: 15, textAlign: 'center', color: Colors.textMuted },
  pressed: { opacity: 0.72 },
});
