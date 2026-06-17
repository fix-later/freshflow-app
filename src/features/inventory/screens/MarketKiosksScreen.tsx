import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Card } from '../../../components/ui/Card';
import { SearchBar } from '../../../components/ui/SearchBar';
import { inventoryApi } from '../api/inventoryApi';
import type { MarketProductDto } from '../../../types/api.types';

const { width } = Dimensions.get('window');

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
      <ScreenContainer scroll={false} padding={false} safeArea={true} edges={['bottom']} bgColor="#F8FAFC">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ── Error state ──
  if (error && products.length === 0) {
    return (
      <ScreenContainer scroll={false} padding={false} safeArea={true} edges={['bottom']} bgColor="#F8FAFC">
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padding={false} safeArea={true} edges={['bottom']} bgColor="#F8FAFC">
      {/* ─── SUMMARY HEADER ──────────────────────────────────── */}
      <View style={styles.summaryHeader}>
        <Text style={styles.subtitleText}>{marketName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Sản phẩm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: Colors.primary }]}>{categoryCount}</Text>
            <Text style={styles.statLabel}>Loại sản phẩm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: lowStockCount > 0 ? Colors.warning : Colors.textPrimary }]}>
              {lowStockCount}
            </Text>
            <Text style={styles.statLabel}>Hết hàng</Text>
          </View>
        </View>
      </View>

      {/* ─── SEARCH & CATEGORY FILTER ───────────────────────── */}
      <View style={styles.controlContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tìm tên sản phẩm, loại..."
        />

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

      {/* ─── PRODUCT LIST ───────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
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
                    <Text style={[styles.priceValue, outOfStock && styles.priceOutOfStock]}>
                      {outOfStock ? '—' : formatPrice(product.currentPrice)}
                    </Text>
                  </View>

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

                  <View style={styles.updateBtn}>
                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery || activeCategory ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào tại chợ này'}
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
    color: Colors.textMuted,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Summary Header ──
  summaryHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
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
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // ── Controls ──
  controlContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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

  // ── Product List ──
  listContainer: {
    padding: 16,
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
  productCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
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
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 1,
  },
  priceOutOfStock: {
    color: Colors.textMuted,
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
    color: Colors.primary,
    marginTop: 4,
  },

  bottomSpacer: {
    height: 60,
  },
});
