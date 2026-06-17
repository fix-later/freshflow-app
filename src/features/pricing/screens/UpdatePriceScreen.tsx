import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { inventoryApi } from '../../inventory/api/inventoryApi';
import type { MarketProductDto } from '../../../types/api.types';
import { PriceDashboardHeader } from '../components/PriceDashboardHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignedMarket {
  marketId: string;
  name: string;
  location: string | null;
  address: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdatePriceScreen() {
  const route = useRoute<any>();
  const routeProductId: string | undefined = route.params?.productId;
  const routeMarketId: string | undefined = route.params?.marketId;

  // ── Data state ──
  const [markets, setMarkets] = useState<AssignedMarket[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(routeMarketId ?? null);
  const [products, setProducts] = useState<MarketProductDto[]>([]);

  // ── UI state ──
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // ── Batch price changes: productId → newPrice ──
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);

  // ── FAB animation ──
  const fabScale = useRef(new Animated.Value(0)).current;

  // ── Derived ──
  const selectedMarket = useMemo(
    () => markets.find((m) => m.marketId === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );

  const uniqueCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      if (!p.category) continue;
      const existing = catMap.get(p.category);
      if (existing) {
        existing.count++;
      } else {
        catMap.set(p.category, { name: p.category, count: 1 });
      }
    }
    return Array.from(catMap.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.unit.toLowerCase().includes(q),
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  const pendingCount = pendingChanges.size;
  const totalProducts = products.length;
  const categoryCount = uniqueCategories.length;
  const lowStockCount = products.filter((p) => p.availableQuantity <= 0).length;

  // ── Animate FAB visibility ──
  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: pendingCount > 0 ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [pendingCount, fabScale]);

  // ── Load initial data ──
  const loadInit = useCallback(async () => {
    try {
      setError(null);
      const assignedMarkets = await inventoryApi.getAssignedMarkets();
      setMarkets(assignedMarkets);
      const targetMarketId =
        routeMarketId ||
        (assignedMarkets.length > 0 ? assignedMarkets[0].marketId : null);
      if (targetMarketId && !selectedMarketId) {
        setSelectedMarketId(targetMarketId);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu');
    }
  }, []);

  // ── Load products for selected market ──
  const loadProducts = useCallback(
    async (marketId: string) => {
      try {
        setError(null);
        setLoadingProducts(true);
        const result = await inventoryApi.getMarketProducts(marketId, {
          pageSize: 100,
        });
        setProducts(Array.isArray(result) ? result : result.items ?? []);
      } catch (err: any) {
        setError(err?.message || 'Không thể tải sản phẩm');
      } finally {
        setLoadingProducts(false);
      }
    },
    [],
  );

  // ── Initial mount ──
  useEffect(() => {
    setLoading(true);
    loadInit().finally(() => setLoading(false));
  }, []);

  // ── Re-fetch products when market changes ──
  useEffect(() => {
    if (!selectedMarketId) return;
    loadProducts(selectedMarketId);
  }, [selectedMarketId, loadProducts]);

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadInit(),
      selectedMarketId ? loadProducts(selectedMarketId) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [selectedMarketId, loadInit, loadProducts]);

  // ── Price change handler ──
  const handlePriceChange = useCallback((productId: string, newPrice: number) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const product = products.find((p) => p.productId === productId);
      if (product && newPrice === product.currentPrice) {
        next.delete(productId);
      } else {
        next.set(productId, newPrice);
      }
      return next;
    });
  }, [products]);

  // ── Batch save all pending changes ──
  const handleSaveAll = useCallback(async () => {
    if (!selectedMarketId || pendingChanges.size === 0) return;

    const entries = Array.from(pendingChanges.entries());
    const total = entries.length;
    let completed = 0;
    let failed = 0;

    Alert.alert(
      'Lưu tất cả thay đổi',
      `Bạn muốn lưu ${total} thay đổi giá?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Lưu',
          onPress: async () => {
            try {
              setSaving(true);
              for (const [productId, newPrice] of entries) {
                try {
                  await inventoryApi.updateProductPrice(selectedMarketId, productId, {
                    price: newPrice,
                  });
                  completed++;
                } catch {
                  failed++;
                }
              }
              setPendingChanges(new Map());
              await loadProducts(selectedMarketId);
              if (failed === 0) {
                Alert.alert('Thành công', `Đã cập nhật ${completed} sản phẩm`);
              } else {
                Alert.alert(
                  'Hoàn tất',
                  `Thành công: ${completed}, Thất bại: ${failed}`,
                );
              }
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [selectedMarketId, pendingChanges, loadProducts]);

  // ── Back to market selection ──
  const handleBackToMarkets = () => {
    setSelectedMarketId(null);
    setProducts([]);
    setPendingChanges(new Map());
    setActiveCategory('');
    setSearchQuery('');
  };

  // ── Price step helper ──

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Market Selection
  // ═══════════════════════════════════════════════════════════════════════════

  if (!selectedMarketId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="pricetag" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Chọn chợ</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.marketList}>
          <Text style={styles.marketListTitle}>Chọn chợ để cập nhật giá</Text>

          {markets.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Chưa được phân công chợ nào</Text>
            </View>
          ) : (
            markets.map((item) => (
              <View key={item.marketId} style={styles.marketCardWrapper}>
                <Pressable
                  style={({ pressed }) => [
                    styles.marketCard,
                    pressed && styles.marketCardPressed,
                  ]}
                  onPress={() => setSelectedMarketId(item.marketId)}
                >
                  <View style={styles.marketCardIcon}>
                    <Ionicons name="storefront" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.marketCardInfo}>
                    <Text style={styles.marketCardName}>{item.name}</Text>
                    {item.address ? (
                      <Text style={styles.marketCardAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : item.location ? (
                      <Text style={styles.marketCardAddress} numberOfLines={1}>
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Product List + Inline Price Update
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── Summary Header (matching MarketKiosksScreen) ─── */}
      <PriceDashboardHeader
        marketName={selectedMarket?.name ?? ''}
        productCount={totalProducts}
        categoryCount={categoryCount}
        outOfStockCount={lowStockCount}
        pendingCount={pendingCount}
      />

      {/* ─── Search & Category Filter (matching MarketKiosksScreen) ─── */}
      <View style={styles.controlContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm tên sản phẩm, loại..."
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
        >
          <Pressable
            style={[styles.filterChip, activeCategory === '' && styles.filterChipActive]}
            onPress={() => setActiveCategory('')}
          >
            <Text style={[styles.filterChipText, activeCategory === '' && styles.filterChipTextActive]}>
              Tất cả ({totalProducts})
            </Text>
          </Pressable>

          {uniqueCategories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <Pressable
                key={cat.name}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveCategory(isActive ? '' : cat.name)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {cat.name} ({cat.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Product List (matching MarketKiosksScreen card layout) ─── */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {loadingProducts ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingSmallText}>Đang tải sản phẩm...</Text>
          </View>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const outOfStock = product.availableQuantity <= 0;
            const displayPrice = pendingChanges.get(product.productId) ?? product.currentPrice;
            const isChanged =
              pendingChanges.has(product.productId) &&
              pendingChanges.get(product.productId) !== product.currentPrice;

            return (
              <View key={product.marketProductId} style={styles.productCard}>
                {/* ─── Product Header ─── */}
                <View style={styles.productHeader}>
                  <View style={styles.productTitleBlock}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.productName}
                    </Text>
                    <View style={styles.productTags}>
                      {product.category ? (
                        <View style={styles.categoryTag}>
                          <Text style={styles.categoryTagText}>{product.category}</Text>
                        </View>
                      ) : null}
                      <View style={styles.unitTag}>
                        <Text style={styles.unitTagText}>{product.unit}</Text>
                      </View>
                    </View>
                  </View>
                  {outOfStock && (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>HẾT HÀNG</Text>
                    </View>
                  )}
                </View>

                {/* ─── Price Adjustment (inline, matching MarketKiosksScreen card style) ─── */}
                <View style={styles.priceAdjustSection}>
                  <View style={styles.priceAdjustHeader}>
                    <Text style={styles.priceAdjustLabel}>Giá hiện tại</Text>
                    <Text style={[styles.priceAdjustCurrent, outOfStock && styles.priceOutOfStock]}>
                      {outOfStock ? '—' : formatPrice(product.currentPrice)}
                    </Text>
                  </View>

                  <View style={styles.priceInputRow}>
                    <TextInput
                      style={[
                        styles.priceInput,
                        isChanged && styles.priceInputChanged,
                        outOfStock && styles.priceInputDisabled,
                      ]}
                      value={displayPrice === 0 && !isChanged ? '' : String(displayPrice)}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '');
                        const num = cleaned === '' ? 0 : Number(cleaned);
                        handlePriceChange(product.productId, num);
                      }}
                      keyboardType="numeric"
                      placeholder="Nhập giá mới..."
                      placeholderTextColor={Colors.textMuted}
                      editable={!outOfStock}
                    />
                    <Text style={styles.priceInputCurrency}>đ</Text>
                  </View>

                  {isChanged && (
                    <Pressable
                      style={styles.resetBtn}
                      onPress={() => handlePriceChange(product.productId, product.currentPrice)}
                    >
                      <Ionicons name="refresh" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.resetText}>Đặt lại giá gốc</Text>
                    </Pressable>
                  )}
                </View>

                {/* ─── Product Footer (matching MarketKiosksScreen) ─── */}
                <View style={styles.productFooter}>
                  <View style={styles.stockSection}>
                    <Ionicons
                      name={outOfStock ? 'alert-circle' : 'cube-outline'}
                      size={16}
                      color={outOfStock ? Colors.danger : Colors.textMuted}
                    />
                    <Text style={[styles.stockText, outOfStock && styles.stockTextDanger]}>
                      Kho: {product.availableQuantity} {product.unit}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery || activeCategory
                ? 'Không tìm thấy sản phẩm phù hợp'
                : 'Chưa có sản phẩm nào tại chợ này'}
            </Text>
            {(searchQuery || activeCategory) && (
              <Pressable onPress={() => { setSearchQuery(''); setActiveCategory(''); }}>
                <Text style={styles.clearFilterText}>Xoá bộ lọc</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ─── Error Banner ─── */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable
            onPress={() => selectedMarketId && loadProducts(selectedMarketId)}
          >
            <Text style={styles.errorBannerAction}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      {/* ─── FAB: Save All Updates ─── */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: fabScale }],
            opacity: fabScale,
          },
        ]}
        pointerEvents={pendingCount > 0 ? 'auto' : 'none'}
      >
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
            saving && styles.fabDisabled,
          ]}
          onPress={handleSaveAll}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="save" size={22} color="#FFFFFF" />
          )}
          <Text style={styles.fabText}>
            {saving
              ? 'Đang lưu...'
              : `Lưu tất cả (${pendingCount})`}
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles (matching MarketKiosksScreen) ─────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 12,
  },

  // ─── Header (Market Selection) ────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // ─── Market Selection ────────────────────────
  marketList: {
    padding: 16,
  },
  marketCardWrapper: {
    marginBottom: 10,
  },
  marketListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  marketCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  marketCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  marketCardInfo: {
    flex: 1,
  },
  marketCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  marketCardAddress: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ─── Controls (matching MarketKiosksScreen) ──────────
  controlContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 8,
    padding: 0,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 4,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },

  // ─── Product List (matching MarketKiosksScreen) ──────
  listContainer: {
    padding: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingSmallText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginLeft: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productTitleBlock: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  productTags: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  unitTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unitTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  outOfStockBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.3,
  },

  // ─── Price Adjustment (inline in card) ───────────────
  priceAdjustSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  priceAdjustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceAdjustLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  priceAdjustCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    padding: 0,
    textAlign: 'right',
  },
  priceInputChanged: {
    color: Colors.warning,
    borderColor: Colors.warning,
  },
  priceInputDisabled: {
    color: Colors.textMuted,
    borderColor: '#E2E8F0',
  },
  priceInputCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  priceOutOfStock: {
    color: Colors.textMuted,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  // ─── Product Footer (matching MarketKiosksScreen) ────
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  stockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  stockTextDanger: {
    color: Colors.danger,
  },

  // ─── Empty (matching MarketKiosksScreen) ──────────────
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },

  // ─── Error Banner ──────────────────────────────────
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34,
  },
  errorBannerText: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  errorBannerAction: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // ─── FAB ────────────────────────────────────────────
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },

  bottomSpacer: {
    height: 60,
  },
});
