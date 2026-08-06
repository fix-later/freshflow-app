import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import { inventoryApi } from '../../inventory/api/inventoryApi';
import type { MarketProductDto, ProductDto } from '../../../types/api.types';
import type { PriceHistoryEntry } from '../../inventory/api/inventoryApi';
import { PriceDashboardHeader } from '../components/PriceDashboardHeader';
import { pricingApi } from '../api/pricingApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignedMarket {
  marketId: string;
  name: string;
  location: string | null;
  address: string | null;
}

type AvailabilityFilter = 'all' | 'outOfStock' | 'changed';
const PRODUCT_PAGE_SIZE = 100;

function categoryName(product: MarketProductDto): string {
  return product.category?.trim() || 'Chưa phân loại';
}

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  const value = name.toLocaleLowerCase('vi-VN');
  if (value.includes('rau') || value.includes('củ') || value.includes('quả')) return 'leaf-outline';
  if (value.includes('cá') || value.includes('hải sản')) return 'fish-outline';
  if (value.includes('thịt')) return 'restaurant-outline';
  if (value.includes('sữa') || value.includes('trứng')) return 'cafe-outline';
  if (value.includes('gia vị')) return 'flask-outline';
  if (value.includes('gạo') || value.includes('khô')) return 'bag-outline';
  return 'basket-outline';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function adjustPrice(value: number, percentage: number): number {
  return Math.max(100, Math.round((value * (1 + percentage / 100)) / 100) * 100);
}

async function loadAllCatalogProducts(): Promise<ProductDto[]> {
  const first = await pricingApi.getProducts({ page: 1, pageSize: PRODUCT_PAGE_SIZE });
  const pageCount = Math.ceil(first.meta.total / first.meta.pageSize);
  if (pageCount <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => (
      pricingApi.getProducts({ page: index + 2, pageSize: PRODUCT_PAGE_SIZE })
    )),
  );
  return [first.data, ...remaining.map((page) => page.data)].flat();
}

function ProductThumbnail({
  imageUrl,
  category,
  size = 58,
}: {
  imageUrl: string | null | undefined;
  category: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [imageUrl]);

  return (
    <View style={[styles.productImageWrap, { width: size, height: size }]}>
      {imageUrl && !failed ? (
        <Image
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={styles.productImage}
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons
          name={getCategoryIcon(category)}
          size={Math.round(size * 0.38)}
          color={Colors.primaryText}
        />
      )}
    </View>
  );
}

function CategoryThumbnail({
  imageUrl,
  category,
  active,
  compact = false,
}: {
  imageUrl: string | null | undefined;
  category: string;
  active: boolean;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [imageUrl]);

  return (
    <View style={[
      styles.categoryImageFrame,
      compact && styles.categoryImageFrameCompact,
      active && styles.categoryImageFrameActive,
    ]}>
      {imageUrl && !failed ? (
        <Image
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={[styles.categoryImage, compact && styles.categoryImageCompact]}
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons
          name={category === 'Tất cả' ? 'grid-outline' : getCategoryIcon(category)}
          size={compact ? 17 : 22}
          color={Colors.primaryText}
        />
      )}
      {active && !compact ? (
        <View style={styles.categorySelectedBadge}>
          <Ionicons name="checkmark" size={11} color={Colors.deepTeal} />
        </View>
      ) : null}
    </View>
  );
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
  const [catalogProducts, setCatalogProducts] = useState<ProductDto[]>([]);

  // ── UI state ──
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryCollapsed, setCategoryCollapsed] = useState(false);

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [editingProductId, setEditingProductId] = useState<string | null>(routeProductId ?? null);

  // ── Batch changes: productId → { price, quantity } ──
  const [pendingChanges, setPendingChanges] = useState<Map<string, { price: number; quantity: number }>>(new Map());
  const [saving, setSaving] = useState(false);

  // ── Detail modal state ──
  const [detailProduct, setDetailProduct] = useState<MarketProductDto | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── FAB animation ──
  const fabScale = useRef(new Animated.Value(0)).current;
  const categoryCollapseAnimation = useRef(new Animated.Value(0)).current;

  // ── Derived ──
  const selectedMarket = useMemo(
    () => markets.find((m) => m.marketId === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );

  const productMetadata = useMemo(
    () => new Map(catalogProducts.map((product) => [product.id, product])),
    [catalogProducts],
  );

  const uniqueCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      const category = categoryName(p);
      const existing = catMap.get(category);
      if (existing) {
        existing.count++;
      } else {
        catMap.set(category, { name: category, count: 1 });
      }
    }
    return Array.from(catMap.values()).sort((left, right) => (
      right.count - left.count || left.name.localeCompare(right.name, 'vi')
    ));
  }, [products]);

  const categoryImageByName = useMemo(() => {
    const imageByName = new Map<string, string | null>();
    const firstProductWithImage = products.find((product) => (
      Boolean(productMetadata.get(product.productId)?.imageUrl)
    ));
    imageByName.set(
      'Tất cả',
      firstProductWithImage
        ? productMetadata.get(firstProductWithImage.productId)?.imageUrl ?? null
        : null,
    );

    uniqueCategories.forEach((category) => {
      const representative = products.find((product) => (
        categoryName(product) === category.name
        && Boolean(productMetadata.get(product.productId)?.imageUrl)
      ));
      imageByName.set(
        category.name,
        representative
          ? productMetadata.get(representative.productId)?.imageUrl ?? null
          : null,
      );
    });

    return imageByName;
  }, [productMetadata, products, uniqueCategories]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter((p) => categoryName(p) === activeCategory);
    }
    if (availabilityFilter === 'outOfStock') {
      result = result.filter((p) => p.availableQuantity <= 0);
    } else if (availabilityFilter === 'changed') {
      result = result.filter((p) => pendingChanges.has(p.productId));
    }
    if (searchQuery.trim()) {
      const q = searchable(searchQuery.trim());
      result = result.filter(
        (p) =>
          searchable(p.productName).includes(q) ||
          searchable(categoryName(p)).includes(q) ||
          searchable(p.unit).includes(q),
      );
    }
    return [...result].sort((left, right) => {
      const leftChanged = Number(pendingChanges.has(left.productId));
      const rightChanged = Number(pendingChanges.has(right.productId));
      const leftOut = Number(left.availableQuantity <= 0);
      const rightOut = Number(right.availableQuantity <= 0);
      return rightChanged - leftChanged
        || rightOut - leftOut
        || left.productName.localeCompare(right.productName, 'vi');
    });
  }, [products, activeCategory, availabilityFilter, searchQuery, pendingChanges]);


  const pendingCount = pendingChanges.size;
  const totalProducts = products.length;
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

  useEffect(() => {
    Animated.timing(categoryCollapseAnimation, {
      toValue: categoryCollapsed ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [categoryCollapseAnimation, categoryCollapsed]);

  const collapseCategories = useCallback(() => setCategoryCollapsed(true), []);
  const expandCategories = useCallback(() => setCategoryCollapsed(false), []);

  // ── Load initial data ──
  const loadInit = useCallback(async () => {
    try {
      setError(null);
      const [assignedMarkets, catalog] = await Promise.all([
        inventoryApi.getAssignedMarkets(),
        loadAllCatalogProducts().catch(() => []),
      ]);
      setMarkets(assignedMarkets);
      setCatalogProducts(catalog);
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
        setProducts(await inventoryApi.getAllMarketProducts(marketId));
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

  // ── Fetch price history when detail modal opens ──
  useEffect(() => {
    if (showDetail && detailProduct && selectedMarketId) {
      setLoadingHistory(true);
      inventoryApi
        .getPriceHistory(selectedMarketId, detailProduct.productId, { pageSize: 50 })
        .then((result) => setPriceHistory(result.items ?? []))
        .catch(() => setPriceHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [showDetail, detailProduct, selectedMarketId]);

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
      const existing = prev.get(productId);
      const currentQty = existing?.quantity ?? product?.availableQuantity ?? 0;

      if (product && newPrice === product.currentPrice && currentQty === product.availableQuantity) {
        next.delete(productId);
      } else {
        next.set(productId, { price: newPrice, quantity: currentQty });
      }
      return next;
    });
  }, [products]);

  // ── Quantity change handler ──
  const handleQuantityChange = useCallback((productId: string, newQty: number) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const product = products.find((p) => p.productId === productId);
      const existing = prev.get(productId);
      const currentPrice = existing?.price ?? product?.currentPrice ?? 0;

      if (product && newQty === product.availableQuantity && currentPrice === product.currentPrice) {
        next.delete(productId);
      } else {
        next.set(productId, { price: currentPrice, quantity: newQty });
      }
      return next;
    });
  }, [products]);

  // ── Batch save all pending changes ──
  const handleSaveAll = useCallback(async () => {
    if (!selectedMarketId || pendingChanges.size === 0) return;

    const entries = Array.from(pendingChanges.entries());
    if (entries.some(([, changes]) => changes.price <= 0 || changes.quantity < 0)) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Giá phải lớn hơn 0 và số lượng không được nhỏ hơn 0.');
      return;
    }
    const total = entries.length;
    let completed = 0;
    let failed = 0;
    const failedChanges = new Map<string, { price: number; quantity: number }>();

    Alert.alert(
      'Lưu tất cả thay đổi',
      `Bạn muốn lưu ${total} thay đổi?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Lưu',
          onPress: async () => {
            try {
              setSaving(true);
              for (const [productId, changes] of entries) {
                try {
                  const payload: { price?: number; quantity?: number } = {};
                  if (changes.price !== undefined) payload.price = changes.price;
                  if (changes.quantity !== undefined) payload.quantity = changes.quantity;
                  await inventoryApi.updateProductPrice(selectedMarketId, productId, payload);
                  completed++;
                } catch {
                  failed++;
                  failedChanges.set(productId, changes);
                }
              }
              setPendingChanges(failedChanges);
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

  // ── Detail modal open/close ──
  const openDetail = (product: MarketProductDto) => {
    setDetailProduct(product);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setPriceHistory([]);
    setDetailProduct(null);
  };

  // ── Price step helper ──

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
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
              <Ionicons name="pricetag-outline" size={18} color={Colors.primaryText} />
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
                    <Ionicons name="storefront-outline" size={22} color={Colors.primaryText} />
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

        <Animated.View
          pointerEvents={categoryCollapsed ? 'none' : 'auto'}
          style={[
            styles.expandedCategoryPanel,
            {
              maxHeight: categoryCollapseAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [190, 0],
              }),
              opacity: categoryCollapseAnimation.interpolate({
                inputRange: [0, 0.72, 1],
                outputRange: [1, 0.2, 0],
              }),
              transform: [{
                translateY: categoryCollapseAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              }],
            },
          ]}
        >
          <View style={styles.categoryHeading}>
            <View>
              <Text style={styles.categoryEyebrow}>CẬP NHẬT NHANH</Text>
              <Text style={styles.categoryHeadingTitle}>Danh mục sản phẩm</Text>
            </View>
            <Pressable
              style={styles.collapseCategoryButton}
              onPress={collapseCategories}
              accessibilityRole="button"
              accessibilityLabel="Thu gọn danh mục sản phẩm"
            >
              <Text style={styles.collapseCategoryButtonText}>Thu gọn</Text>
              <Ionicons name="chevron-up" size={14} color={Colors.primaryText} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rootCategoryList}
          >
            {[{ name: 'Tất cả', count: totalProducts }, ...uniqueCategories].map((category, index) => {
              const isAll = index === 0;
              const active = isAll ? activeCategory === '' : activeCategory === category.name;
              return (
                <Pressable
                  key={category.name}
                  style={styles.rootCategory}
                  onPress={() => setActiveCategory(isAll ? '' : category.name)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <CategoryThumbnail
                    imageUrl={categoryImageByName.get(category.name)}
                    category={category.name}
                    active={active}
                  />
                  <Text
                    style={[styles.rootCategoryText, active && styles.rootCategoryTextActive]}
                    numberOfLines={2}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          pointerEvents={categoryCollapsed ? 'auto' : 'none'}
          style={[
            styles.compactCategoryPanel,
            {
              maxHeight: categoryCollapseAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 52],
              }),
              opacity: categoryCollapseAnimation,
            },
          ]}
        >
          <Pressable
            style={styles.compactCategoryBar}
            onPress={expandCategories}
            accessibilityRole="button"
            accessibilityLabel="Mở danh mục sản phẩm"
          >
            <CategoryThumbnail
              imageUrl={categoryImageByName.get(activeCategory || 'Tất cả')}
              category={activeCategory || 'Tất cả'}
              active={false}
              compact
            />
            <View style={styles.compactCategoryCopy}>
              <Text style={styles.compactCategoryLabel}>DANH MỤC ĐANG CHỌN</Text>
              <Text style={styles.compactCategoryName} numberOfLines={1}>
                {activeCategory || 'Tất cả sản phẩm'}
              </Text>
            </View>
            <Text style={styles.compactCategoryCount} numeric>
              {activeCategory
                ? uniqueCategories.find((category) => category.name === activeCategory)?.count ?? 0
                : totalProducts}
            </Text>
            <View style={styles.compactCategoryExpand}>
              <Text style={styles.compactCategoryExpandText}>Mở danh mục</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.primaryText} />
            </View>
          </Pressable>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilters}>
          <QuickFilter
            label="Tất cả sản phẩm"
            count={totalProducts}
            active={availabilityFilter === 'all'}
            onPress={() => setAvailabilityFilter('all')}
          />
          <QuickFilter
            label="Hết hàng"
            count={lowStockCount}
            active={availabilityFilter === 'outOfStock'}
            danger={lowStockCount > 0}
            onPress={() => setAvailabilityFilter('outOfStock')}
          />
          <QuickFilter
            label="Đã thay đổi"
            count={pendingCount}
            active={availabilityFilter === 'changed'}
            onPress={() => setAvailabilityFilter('changed')}
          />
        </ScrollView>

        <View style={styles.resultRow}>
          <Text style={styles.resultText} numeric>{filteredProducts.length} sản phẩm phù hợp</Text>
          {(searchQuery || activeCategory || availabilityFilter !== 'all') ? (
            <Pressable onPress={() => {
              setSearchQuery('');
              setActiveCategory('');
              setAvailabilityFilter('all');
            }}>
              <Text style={styles.clearAllText}>Xoá bộ lọc</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ─── Product List (matching MarketKiosksScreen card layout) ─── */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primaryText]} />
        }
      >
        {loadingProducts ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primaryText} />
            <Text style={styles.loadingSmallText}>Đang tải sản phẩm...</Text>
          </View>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const outOfStock = product.availableQuantity <= 0;
            const pending = pendingChanges.get(product.productId);
            const displayPrice = pending?.price ?? product.currentPrice;
            const displayQuantity = pending?.quantity ?? product.availableQuantity;
            const isPriceChanged = pending?.price !== undefined && pending.price !== product.currentPrice;
            const isQtyChanged = pending?.quantity !== undefined && pending.quantity !== product.availableQuantity;
            const isChanged = isPriceChanged || isQtyChanged;
            const isEditing = editingProductId === product.productId;
            const imageUrl = productMetadata.get(product.productId)?.imageUrl;

            return (
              <View key={product.marketProductId} style={[styles.productCard, isChanged && styles.productCardChanged]}>
                <View style={styles.productHeader}>
                  <View style={styles.listThumbnail}>
                    <ProductThumbnail imageUrl={imageUrl} category={categoryName(product)} />
                  </View>
                  <View style={styles.productTitleBlock}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.productName}
                    </Text>
                    <View style={styles.productTags}>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{categoryName(product)}</Text>
                      </View>
                      <View style={styles.unitTag}>
                        <Text style={styles.unitTagText}>{product.unit}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.productHeaderActions}>
                    {outOfStock ? (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>HẾT HÀNG</Text>
                      </View>
                    ) : null}
                    <Pressable accessibilityLabel="Xem lịch sử giá" hitSlop={8} onPress={() => openDetail(product)}>
                      <Ionicons name="information-circle-outline" size={21} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.productSnapshot}>
                  <View style={styles.snapshotItem}>
                    <Text style={styles.snapshotLabel}>Giá bán</Text>
                    <Text style={[styles.snapshotValue, isPriceChanged && styles.snapshotChanged]} numeric>
                      {formatPrice(displayPrice)}
                    </Text>
                  </View>
                  <View style={styles.snapshotDivider} />
                  <View style={styles.snapshotItem}>
                    <Text style={styles.snapshotLabel}>Tồn khả dụng</Text>
                    <Text style={[styles.snapshotValue, outOfStock && styles.stockTextDanger, isQtyChanged && styles.snapshotChanged]} numeric>
                      {displayQuantity} {product.unit}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.editToggle, isEditing && styles.editToggleActive]}
                    onPress={() => setEditingProductId(isEditing ? null : product.productId)}
                  >
                    <Ionicons name={isEditing ? 'chevron-up' : 'create-outline'} size={16} color={Colors.primaryText} />
                    <Text style={styles.editToggleText}>{isEditing ? 'Thu gọn' : 'Cập nhật'}</Text>
                  </Pressable>
                </View>

                {isEditing ? (
                  <View style={styles.editorPanel}>
                    <View style={styles.editorInputs}>
                      <View style={styles.editorField}>
                        <Text style={styles.editorLabel}>Giá mới</Text>
                        <View style={[styles.priceInputRow, isPriceChanged && styles.inputRowChanged]}>
                          <TextInput
                            numeric
                            style={styles.priceInput}
                            value={displayPrice === 0 ? '' : String(displayPrice)}
                            onChangeText={(text) => {
                              const cleaned = text.replace(/[^0-9]/g, '');
                              handlePriceChange(product.productId, cleaned === '' ? 0 : Number(cleaned));
                            }}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.priceInputCurrency}>đ</Text>
                        </View>
                      </View>
                      <View style={styles.editorField}>
                        <Text style={styles.editorLabel}>Số lượng mới</Text>
                        <View style={[styles.priceInputRow, isQtyChanged && styles.inputRowChanged]}>
                          <TextInput
                            numeric
                            style={styles.priceInput}
                            value={String(displayQuantity)}
                            onChangeText={(text) => {
                              const cleaned = text.replace(/[^0-9]/g, '');
                              handleQuantityChange(product.productId, cleaned === '' ? 0 : Number(cleaned));
                            }}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.priceInputCurrency}>{product.unit}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.editorActions}>
                      <Text style={styles.quickPriceLabel}>Điều chỉnh nhanh:</Text>
                      {[-5, 5, 10].map((percentage) => (
                        <Pressable
                          key={percentage}
                          style={styles.quickPriceButton}
                          onPress={() => handlePriceChange(
                            product.productId,
                            adjustPrice(product.currentPrice, percentage),
                          )}
                        >
                          <Text style={styles.quickPriceText}>{percentage > 0 ? '+' : ''}{percentage}%</Text>
                        </Pressable>
                      ))}
                      {isChanged ? (
                        <Pressable
                          style={styles.resetBtn}
                          onPress={() => {
                            handlePriceChange(product.productId, product.currentPrice);
                            handleQuantityChange(product.productId, product.availableQuantity);
                          }}
                        >
                          <Ionicons name="refresh-outline" size={13} color={Colors.primaryText} />
                          <Text style={styles.resetText}>Đặt lại</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {outOfStock ? (
                      <View style={styles.restockHint}>
                        <Ionicons name="information-circle-outline" size={15} color={Colors.primaryText} />
                        <Text style={styles.restockHintText}>Nhập số lượng lớn hơn 0 để mở bán lại sản phẩm.</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {isChanged ? (
                  <View style={styles.changedNotice}>
                    <Ionicons name="ellipse" size={8} color={Colors.primaryText} />
                    <Text style={styles.changedNoticeText}>Thay đổi chưa được lưu</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery || activeCategory || availabilityFilter !== 'all'
                ? 'Không tìm thấy sản phẩm phù hợp'
                : 'Chưa có sản phẩm nào tại chợ này'}
            </Text>
            {(searchQuery || activeCategory || availabilityFilter !== 'all') && (
              <Pressable onPress={() => {
                setSearchQuery('');
                setActiveCategory('');
                setAvailabilityFilter('all');
              }}>
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
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Ionicons name="save-outline" size={22} color={Colors.onPrimary} />
          )}
          <Text style={styles.fabText}>
            {saving
              ? 'Đang lưu...'
              : `Lưu tất cả (${pendingCount})`}
          </Text>
        </Pressable>
      </Animated.View>

      {/* ─── Product Detail Modal ─── */}
      <Modal
        visible={showDetail}
        animationType="slide"
        transparent
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="cube-outline" size={20} color={Colors.primaryText} />
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {detailProduct?.productName ?? ''}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={closeDetail}
              >
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {detailProduct && (
                <>
                  {/* ─── Product Info Section ─── */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thông tin sản phẩm</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalImageRow}>
                        <ProductThumbnail
                          imageUrl={productMetadata.get(detailProduct.productId)?.imageUrl}
                          category={categoryName(detailProduct)}
                          size={104}
                        />
                      </View>
                      {/* Tags row */}
                      <View style={styles.modalTagsRow}>
                        {detailProduct.category ? (
                          <View style={styles.categoryTag}>
                            <Text style={styles.categoryTagText}>{detailProduct.category}</Text>
                          </View>
                        ) : null}
                        <View style={styles.unitTag}>
                          <Text style={styles.unitTagText}>{detailProduct.unit}</Text>
                        </View>
                      </View>

                      {/* Info grid */}
                      <View style={styles.modalInfoGrid}>
                        <View style={styles.modalInfoItem}>
                          <Text style={styles.modalInfoLabel}>Giá hiện tại</Text>
                          <Text numeric style={styles.modalInfoValue}>
                            {formatPrice(detailProduct.currentPrice)}
                          </Text>
                        </View>
                        <View style={styles.modalInfoDivider} />
                        <View style={styles.modalInfoItem}>
                          <Text style={styles.modalInfoLabel}>Số lượng</Text>
                          <Text numeric style={styles.modalInfoValue}>
                            {detailProduct.currentQuantity} {detailProduct.unit}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalInfoGrid}>
                        <View style={styles.modalInfoItem}>
                          <Text style={styles.modalInfoLabel}>Kho khả dụng</Text>
                          <Text numeric style={[
                            styles.modalInfoValue,
                            detailProduct.availableQuantity <= 0 && { color: Colors.danger },
                          ]}>
                            {detailProduct.availableQuantity} {detailProduct.unit}
                          </Text>
                        </View>
                        <View style={styles.modalInfoDivider} />
                        <View style={styles.modalInfoItem}>
                          <Text style={styles.modalInfoLabel}>Cập nhật lần cuối</Text>
                          <Text style={styles.modalInfoValueSmall} numberOfLines={2}>
                            {formatRelativeTime(detailProduct.updatedAt)}
                            {detailProduct.updatedBy ? `\nbởi ${detailProduct.updatedBy}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* ─── Price History Section ─── */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="time-outline" size={18} color={Colors.primaryText} />
                      <Text style={styles.modalSectionTitle}>Lịch sử giá</Text>
                    </View>

                    {loadingHistory ? (
                      <View style={styles.modalLoading}>
                        <ActivityIndicator size="small" color={Colors.primaryText} />
                        <Text style={styles.modalLoadingText}>Đang tải lịch sử...</Text>
                      </View>
                    ) : priceHistory.length > 0 ? (
                      <View style={styles.historyList}>
                        {/* Table header */}
                        <View style={styles.historyRowHeader}>
                          <Text style={[styles.historyColHeader, { flex: 2 }]}>Giá</Text>
                          <Text style={[styles.historyColHeader, { flex: 1.5 }]}>Số lượng</Text>
                          <Text style={[styles.historyColHeader, { flex: 2, textAlign: 'right' }]}>Thời gian</Text>
                        </View>

                        {priceHistory.map((entry, index) => (
                          <View
                            key={`${entry.recordedAt}-${index}`}
                            style={[
                              styles.historyRow,
                              index === priceHistory.length - 1 && styles.historyRowLast,
                            ]}
                          >
                            <Text numeric style={[styles.historyCol, { flex: 2, color: Colors.primaryText, fontWeight: '700' }]}>
                              {formatPrice(entry.price)}
                            </Text>
                            <Text numeric style={[styles.historyCol, { flex: 1.5 }]}>
                              {entry.quantity} {detailProduct.unit}
                            </Text>
                            <View style={{ flex: 2, alignItems: 'flex-end' }}>
                              <Text style={[styles.historyCol, { textAlign: 'right' }]}>
                                {formatFullDate(entry.recordedAt)}
                              </Text>
                              {entry.recordedBy ? (
                                <Text style={styles.historyBy}>{entry.recordedBy}</Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.modalEmpty}>
                        <Ionicons name="document-text-outline" size={36} color={Colors.textMuted} />
                        <Text style={styles.modalEmptyText}>Chưa có lịch sử giá</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <Pressable style={styles.modalFooterBtn} onPress={closeDetail}>
              <Text style={styles.modalFooterBtnText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function QuickFilter({
  label,
  count,
  active,
  danger = false,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.quickFilter, active && styles.quickFilterActive]}
      onPress={onPress}
    >
      <Text style={[styles.quickFilterText, active && styles.quickFilterTextActive]}>{label}</Text>
      <View style={[styles.quickFilterCount, danger && styles.quickFilterCountDanger]}>
        <Text style={[styles.quickFilterCountText, danger && styles.quickFilterCountDangerText]} numeric>{count}</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles (matching MarketKiosksScreen) ─────────────────────────────────────

const styles = StyleSheet.create({
  categoryHeading: {
    marginTop: 17,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryEyebrow: {
    marginBottom: 3,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  categoryHeadingTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.textPrimary },
  collapseCategoryButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C9F4DD',
  },
  collapseCategoryButtonText: {
    fontSize: 9,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  expandedCategoryPanel: { overflow: 'hidden' },
  rootCategoryList: {
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  rootCategory: {
    width: 82,
    height: 108,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 3,
  },
  categoryImageFrame: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryImageFrameActive: {
    borderWidth: 2.5,
    borderColor: Colors.primaryText,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.surfaceContainerLow,
  },
  categorySelectedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  rootCategoryText: {
    width: '100%',
    height: 34,
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    color: Colors.textPrimary,
  },
  rootCategoryTextActive: { color: Colors.primaryText, fontFamily: Fonts.bold },
  compactCategoryPanel: { overflow: 'hidden' },
  compactCategoryBar: {
    height: 46,
    marginTop: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C9F4DD',
  },
  categoryImageFrameCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
  },
  categoryImageCompact: { width: 30, height: 30, borderRadius: 15 },
  compactCategoryCopy: { flex: 1, minWidth: 0 },
  compactCategoryLabel: {
    fontSize: 7,
    letterSpacing: 0.7,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  compactCategoryName: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.deepTeal,
    fontFamily: Fonts.semibold,
  },
  compactCategoryCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: Fonts.monoBold,
  },
  compactCategoryExpand: {
    minWidth: 82,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 7,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  compactCategoryExpandText: {
    fontSize: 8,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChoice: {
    width: '48.8%',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 9,
    gap: 6,
  },
  categoryChoiceActive: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  categoryChoiceText: { flex: 1, minWidth: 0, fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  categoryChoiceTextActive: { color: Colors.primaryText },
  categoryCount: { fontSize: 9, fontFamily: Fonts.monoBold, color: Colors.textMuted },
  quickFilters: { gap: 8, paddingTop: 13, paddingBottom: 3 },
  quickFilter: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingLeft: 11,
    paddingRight: 6,
    gap: 7,
  },
  quickFilterActive: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  quickFilterText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  quickFilterTextActive: { color: Colors.primaryText },
  quickFilterCount: { minWidth: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerHigh },
  quickFilterCountText: { fontSize: 8, fontFamily: Fonts.monoBold, color: Colors.textSecondary },
  quickFilterCountDanger: { backgroundColor: Colors.dangerLight },
  quickFilterCountDangerText: { color: Colors.danger },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 11 },
  resultText: { fontSize: 9, fontFamily: Fonts.monoMedium, color: Colors.textMuted },
  clearAllText: { fontSize: 9, fontWeight: '800', color: Colors.primaryText },
  productCardChanged: { borderColor: Colors.primary600, backgroundColor: '#FCFFFD' },
  productHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productImageWrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
  },
  productImage: { width: '100%', height: '100%' },
  listThumbnail: { marginRight: 10 },
  modalImageRow: { alignItems: 'center', marginBottom: 13 },
  productSnapshot: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 11,
  },
  snapshotItem: { flex: 1, minWidth: 0 },
  snapshotLabel: { fontSize: 8, color: Colors.textMuted },
  snapshotValue: { fontSize: 11, fontFamily: Fonts.monoBold, color: Colors.textPrimary, marginTop: 4 },
  snapshotChanged: { color: Colors.primaryText },
  snapshotDivider: { width: 1, height: 30, backgroundColor: Colors.border, marginHorizontal: 8 },
  editToggle: {
    minHeight: 35,
    borderRadius: 9,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
  },
  editToggleActive: { borderWidth: 1, borderColor: Colors.primary600 },
  editToggleText: { fontSize: 9, fontWeight: '800', color: Colors.primaryText },
  editorPanel: { marginTop: 10, borderRadius: 12, backgroundColor: Colors.surfaceContainerLow, padding: 11 },
  editorInputs: { flexDirection: 'row', gap: 8 },
  editorField: { flex: 1, minWidth: 0 },
  editorLabel: { fontSize: 8, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5 },
  inputRowChanged: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  editorActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  quickPriceLabel: { fontSize: 8, color: Colors.textMuted, marginRight: 2 },
  quickPriceButton: { minHeight: 28, minWidth: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickPriceText: { fontSize: 9, fontFamily: Fonts.monoBold, color: Colors.primaryText },
  restockHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9, padding: 8, borderRadius: 8, backgroundColor: Colors.primaryLight },
  restockHintText: { flex: 1, fontSize: 8, color: Colors.primaryText },
  changedNotice: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  changedNoticeText: { fontSize: 8, fontWeight: '700', color: Colors.primaryText },
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
    backgroundColor: Colors.surface,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surfaceContainer,
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
    color: Colors.primaryText,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productHeaderPressed: {
    opacity: 0.6,
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
    backgroundColor: Colors.surfaceContainer,
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
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  qtyAdjustSection: {
    backgroundColor: Colors.surfaceContainerLow,
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
    fontFamily: Fonts.monoSemibold,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryText,
    fontFamily: Fonts.monoBold,
    padding: 0,
    textAlign: 'right',
  },
  priceInputChanged: {
    color: Colors.accent,
    borderColor: Colors.accent,
  },
  priceInputDisabled: {
    color: Colors.textMuted,
    borderColor: Colors.border,
  },
  priceInputCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryText,
    fontFamily: Fonts.monoSemibold,
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
    color: Colors.primaryText,
    textDecorationLine: 'underline',
  },

  // ─── Product Footer (matching MarketKiosksScreen) ────
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    color: Colors.primaryText,
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
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
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
    color: Colors.onPrimary,
    marginLeft: 10,
  },

  bottomSpacer: {
    height: 60,
  },

  // ─── Product Detail Modal ──────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    shadowColor: Colors.deepTeal,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalInfoCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
  },
  modalTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalInfoItem: {
    flex: 1,
  },
  modalInfoDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
    alignSelf: 'stretch',
  },
  modalInfoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryText,
    fontFamily: Fonts.monoBold,
  },
  modalInfoValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  modalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  historyList: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    overflow: 'hidden',
  },
  historyRowHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainer,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyCol: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: Fonts.monoMedium,
  },
  historyBy: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modalFooterBtn: {
    marginHorizontal: 20,
    marginVertical: 14,
    paddingVertical: 14,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalFooterBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
