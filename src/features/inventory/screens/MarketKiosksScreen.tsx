import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { inventoryApi } from '../api/inventoryApi';
import type { MarketProductDto } from '../../../types/api.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketKiosksScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const marketId: string = route.params?.marketId;
  const marketName: string = route.params?.marketName || 'Chợ Đầu Mối';

  // ── Data state ──
  const [products, setProducts] = useState<MarketProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await inventoryApi.getMarketProducts(marketId, { pageSize: 50 });
      setProducts(Array.isArray(result) ? result : result.items ?? []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    }
  }, [marketId]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Derived data ──
  // Derive unique categories from product data (works even if getCategories API fails)
  const uniqueCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; count: number }>();
    products.forEach((p) => {
      if (!p.category) return;
      const existing = catMap.get(p.category);
      if (existing) {
        existing.count++;
      } else {
        catMap.set(p.category, { name: p.category, count: 1 });
      }
    });
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

  const totalProducts = products.length;
  const categoryCount = uniqueCategories.length;
  const lowStockCount = products.filter((p) => p.availableQuantity <= 0).length;

  // ── Handlers ──
  const handleProductPress = (product: MarketProductDto) => {
    navigation.navigate('UpdatePrice', { productId: product.productId, marketId });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <ScreenContainer
        scroll={false}
        padding={false}
        safeArea={true}
        edges={['bottom']}
        bgColor={Colors.background}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
          <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ── Error state ──
  if (error && products.length === 0) {
    return (
      <ScreenContainer
        scroll={false}
        padding={false}
        safeArea={true}
        edges={['bottom']}
        bgColor={Colors.background}
      >
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            onPress={() => {
              setLoading(true);
              fetchData().finally(() => setLoading(false));
            }}
            accessibilityRole="button"
            accessibilityLabel="Thử tải lại danh sách sản phẩm"
          >
            <Ionicons name="refresh" size={17} color={Colors.onPrimary} />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll={false}
      padding={false}
      safeArea={true}
      edges={['bottom']}
      bgColor={Colors.background}
    >
      {/* ─── SUMMARY HEADER ──────────────────────────────────── */}
      <View style={styles.summaryHeader}>
        <Text style={styles.subtitleText}>{marketName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text numeric style={styles.statVal}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Sản phẩm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text numeric style={[styles.statVal, { color: Colors.primaryText }]}>
              {categoryCount}
            </Text>
            <Text style={styles.statLabel}>Loại sản phẩm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text
              numeric
              style={[
                styles.statVal,
                { color: lowStockCount > 0 ? Colors.danger : Colors.textPrimary },
              ]}
            >
              {lowStockCount}
            </Text>
            <Text style={styles.statLabel}>Hết hàng</Text>
          </View>
        </View>
      </View>

      {/* ─── SEARCH & CATEGORY FILTER ───────────────────────── */}
      <View style={styles.controlContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm tên sản phẩm, loại..."
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Tìm kiếm sản phẩm"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              style={styles.clearSearchButton}
              accessibilityRole="button"
              accessibilityLabel="Xóa nội dung tìm kiếm"
            >
              <Ionicons name="close-circle" size={18} color={Colors.primaryText} />
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
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategory === '' }}
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
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {cat.name} ({cat.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── PRODUCT LIST ───────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primaryText]}
            tintColor={Colors.primaryText}
          />
        }
      >
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const outOfStock = product.availableQuantity <= 0;
            return (
              <Pressable
                key={product.marketProductId}
                onPress={() => handleProductPress(product)}
                style={({ pressed }) => [styles.productCard, pressed && styles.productCardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${product.productName}, ${formatPrice(product.currentPrice)}, kho ${product.availableQuantity} ${product.unit}`}
                accessibilityHint="Mở màn hình cập nhật giá"
              >
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

                <View style={styles.productFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Giá hiện tại</Text>
                    <Text numeric style={[styles.priceValue, outOfStock && styles.priceOutOfStock]}>
                      {outOfStock ? '—' : formatPrice(product.currentPrice)}
                    </Text>
                  </View>

                  <View style={styles.stockSection}>
                    <Ionicons
                      name={outOfStock ? 'alert-circle' : 'cube-outline'}
                      size={16}
                      color={outOfStock ? Colors.danger : Colors.textSecondary}
                    />
                    <Text
                      numeric
                      numberOfLines={1}
                      style={[styles.stockText, outOfStock && styles.stockTextDanger]}
                    >
                      Kho: {product.availableQuantity} {product.unit}
                    </Text>
                  </View>

                  <View style={styles.updateBtn}>
                    <Ionicons name="create-outline" size={18} color={Colors.primaryText} />
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery || activeCategory ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào tại chợ này'}
            </Text>
            {(searchQuery || activeCategory) && (
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setActiveCategory('');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clearFilterText}>Xoá bộ lọc</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    color: Colors.danger,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 280,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    minHeight: 48,
  },
  retryBtnPressed: {
    backgroundColor: Colors.primary600,
  },
  retryBtnText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Summary Header ──
  summaryHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subtitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.monoBold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  // ── Controls ──
  controlContainer: {
    backgroundColor: Colors.surface,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    flex: 1,
    height: 44,
    padding: 0,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  clearSearchButton: {
    padding: 4,
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
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primaryText,
  },

  // ── Product List ──
  listContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  productCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
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
    color: Colors.primaryText,
  },
  unitTag: {
    backgroundColor: Colors.surfaceContainerLow,
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
    backgroundColor: Colors.dangerLight,
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
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.monoBold,
    color: Colors.primaryText,
    marginTop: 1,
  },
  priceOutOfStock: {
    color: Colors.textSecondary,
  },
  stockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    paddingHorizontal: 8,
  },
  stockText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: Fonts.monoMedium,
    flexShrink: 1,
  },
  stockTextDanger: {
    color: Colors.danger,
  },
  updateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty ──
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
    color: Colors.primaryText,
    marginTop: 4,
  },

  bottomSpacer: {
    height: 60,
  },
});
