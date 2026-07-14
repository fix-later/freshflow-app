import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../../store/authStore';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Card } from '../../../components/ui/Card';
import { RestaurantText as Text } from '../../restaurant/components/RestaurantText';
import { RestaurantColors as Colors, RestaurantFonts } from '../../restaurant/theme';
import { inventoryApi, type AssignedMarketDto } from '../api/inventoryApi';
import type { MarketProductDto } from '../../../types/api.types';

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketAgentHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [assignedMarkets, setAssignedMarkets] = useState<AssignedMarketDto[]>([]);
  const [priceProducts, setPriceProducts] = useState<MarketProductDto[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const markets = await inventoryApi.getAssignedMarkets();
      setAssignedMarkets(markets);

      // Fetch products from all assigned markets for the price watchlist
      const allProducts: MarketProductDto[] = [];
      for (const market of markets) {
        try {
          const page = await inventoryApi.getMarketProducts(market.marketId, { pageSize: 10 });
          const items = Array.isArray(page) ? page : page.items ?? [];
          allProducts.push(...items);
        } catch {
          // Skip failed market — don't block the whole screen
        }
      }
      // Sort by most recently updated
      allProducts.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setPriceProducts(allProducts.slice(0, 10));
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const formatRelativeTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  // ── Loading state ──
  if (loading) {
    return (
      <ScreenContainer
        scroll={false}
        safeArea={true}
        edges={['top']}
        bgColor={Colors.background}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll={true}
      padding={false}
      safeArea={true}
      edges={['top']}
      bgColor={Colors.background}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primaryText]} />
      }
    >
      {/* ─── HEADER BANNER ────────────────────────────────────────── */}
      <View style={styles.headerBanner}>
        <View style={styles.headerDecoCircle1} />
        <View style={styles.headerDecoCircle2} />

        {/* Row: avatar + greeting + notification bell */}
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Xin chào,</Text>
              <Text style={styles.userName}>{user?.name || 'Market Agent'}</Text>
            </View>
          </View>
          <Pressable
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Ecosystem Status Card */}
        <View style={styles.ecosystemCard}>
          <View style={styles.ecosystemLeft}>
            <Text style={styles.ecosystemTitle}>Trạng thái Hệ sinh thái</Text>
            <Text style={styles.ecosystemSub}>
              Tổng quan thời gian thực các trung tâm vận hành được phân công.
            </Text>
          </View>
          <View style={styles.ecosystemStatsRow}>
            <View style={styles.ecoStatItem}>
              <Text style={styles.ecoStatVal} numeric>{assignedMarkets.length}</Text>
              <Text style={styles.ecoStatLabel}>Chợ được phân công</Text>
            </View>
            <View style={styles.ecoStatDivider} />
            <View style={styles.ecoStatItem}>
              <Text style={styles.ecoStatVal} numeric>{priceProducts.length}</Text>
              <Text style={styles.ecoStatLabel}>Sản phẩm theo dõi</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── CONTENT ──────────────────────────────────────────────── */}
      <View style={styles.contentPadding}>

        {/* Quick Metrics */}
        <View style={styles.metricsRow}>
          <Card
            style={StyleSheet.flatten([styles.metricCard, { borderColor: Colors.primary600 }])}
            padding="sm"
            onPress={() => navigation.navigate('UpdatePrice')}
          >
            <View style={styles.metricIconRow}>
              <View style={[styles.metricIconBg, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="pricetags-outline" size={20} color={Colors.primaryText} />
              </View>
            </View>
            <Text style={styles.metricValue} numeric>{priceProducts.length}</Text>
            <Text style={styles.metricLabelText}>Sản phẩm hiện có</Text>
          </Card>

          <Card
            style={StyleSheet.flatten([styles.metricCard, { borderColor: Colors.secondary }])}
            padding="sm"
          >
            <View style={styles.metricIconRow}>
              <View style={[styles.metricIconBg, { backgroundColor: Colors.secondaryContainer }]}>
                <Ionicons name="time-outline" size={20} color={Colors.secondary} />
              </View>
            </View>
            <Text style={styles.metricValue} numeric>{assignedMarkets.length} chợ</Text>
            <Text style={styles.metricLabelText}>Đang phụ trách</Text>
          </Card>
        </View>

        {/* ─── ASSIGNED MARKETS ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Chợ Đầu Mối Được Phân Công</Text>

        {assignedMarkets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="storefront-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Chưa được phân công chợ nào</Text>
            <Text style={styles.emptySubtext}>Liên hệ quản trị để được phân công chợ</Text>
          </View>
        ) : (
          assignedMarkets.map((market) => (
            <View key={market.marketId} style={styles.marketCard}>
              <View style={styles.marketDetails}>
                <View style={styles.marketTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.marketTitle}>{market.name}</Text>
                    {market.address ? (
                      <Text style={styles.marketFocus}>{market.address}</Text>
                    ) : market.location ? (
                      <Text style={styles.marketFocus}>{market.location}</Text>
                    ) : null}
                  </View>
                  <View style={styles.activeBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.viewKiosksBtn, pressed && styles.viewKiosksBtnPressed]}
                  onPress={() =>
                    navigation.navigate('MarketKiosks', {
                      marketId: market.marketId,
                      marketName: market.name,
                    })
                  }
                >
                  <Text style={styles.viewKiosksBtnText}>Xem Kiosk liên kết</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* ─── PRICE WATCHLIST ──────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Theo dõi giá biến động</Text>
          <Pressable onPress={() => navigation.navigate('UpdatePrice')}>
            <Text style={styles.seeAllLink}>Tất cả giá</Text>
          </Pressable>
        </View>

        {priceProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="pricetag-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Chưa có sản phẩm nào</Text>
            <Text style={styles.emptySubtext}>Sản phẩm sẽ xuất hiện khi được thêm vào chợ</Text>
          </View>
        ) : (
          <View style={styles.watchlistCard}>
            {priceProducts.map((item, index) => (
              <View
                key={item.marketProductId}
                style={[styles.watchlistItem, index === priceProducts.length - 1 && styles.noBorder]}
              >
                <View style={styles.watchlistProductInfo}>
                  <Text style={styles.watchlistProductName}>{item.productName}</Text>
                  <Text style={styles.watchlistTime}>
                    {formatRelativeTime(item.updatedAt)} • {item.unit}
                  </Text>
                </View>

                <View style={styles.watchlistPriceSection}>
                  <Text style={styles.watchlistPriceText} numeric>{formatPrice(item.currentPrice)}</Text>
                  <Text style={styles.watchlistQtyText} numeric>
                    Kho: {item.availableQuantity} {item.unit}
                  </Text>
                </View>

                <Pressable
                  style={styles.quickPriceBtn}
                  onPress={() => navigation.navigate('UpdatePrice', { productId: item.productId, marketId: item.marketId })}
                >
                  <Ionicons name="create-outline" size={18} color={Colors.primaryText} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </View>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // ── Header Banner ──
  headerBanner: {
    backgroundColor: Colors.deepTeal,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecoCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerDecoCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  welcomeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.deepTeal,
  },

  // ── Ecosystem Card (inside header) ──
  ecosystemCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ecosystemLeft: {
    marginBottom: 14,
  },
  ecosystemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  ecosystemSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
  },
  ecosystemStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecoStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  ecoStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  ecoStatVal: {
    fontSize: 22,
    fontFamily: RestaurantFonts.monoBold,
    color: Colors.white,
  },
  ecoStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Content wrapper ──
  contentPadding: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Quick Metrics ──
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metricIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontFamily: RestaurantFonts.monoSemibold,
    color: Colors.textPrimary,
  },
  metricLabelText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Section labels ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryText,
  },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // ── Market Card ──
  marketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  marketDetails: {
    padding: 16,
    gap: 12,
  },
  marketTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  marketFocus: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primaryText,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryText,
    letterSpacing: 0.5,
  },
  viewKiosksBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  viewKiosksBtnPressed: {
    opacity: 0.85,
  },
  viewKiosksBtnText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Price Watchlist ──
  watchlistCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  watchlistProductInfo: {
    flex: 1,
  },
  watchlistProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  watchlistTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  watchlistPriceSection: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  watchlistPriceText: {
    fontSize: 14,
    fontFamily: RestaurantFonts.monoSemibold,
    color: Colors.primaryText,
  },
  watchlistQtyText: {
    fontSize: 11,
    fontFamily: RestaurantFonts.monoRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickPriceBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSpacer: {
    height: 48,
  },
});
