import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import type { MarketProductDto } from '../../../types/api.types';
import type { PriceHistoryEntry } from '../../inventory/api/inventoryApi';
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
          p.category?.toLowerCase().includes(q) ||
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
    const total = entries.length;
    let completed = 0;
    let failed = 0;

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

            return (
              <View key={product.marketProductId} style={styles.productCard}>
                {/* ─── Product Header (tappable) ─── */}
                <Pressable
                  style={({ pressed }) => [
                    styles.productHeader,
                    pressed && styles.productHeaderPressed,
                  ]}
                  onPress={() => openDetail(product)}
                >
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
                  {outOfStock ? (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>HẾT HÀNG</Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={Colors.textMuted}
                      style={{ marginLeft: 4, marginTop: 2 }}
                    />
                  )}
                </Pressable>

                {/* ─── Price Adjustment (inline, matching MarketKiosksScreen card style) ─── */}
                <View style={styles.priceAdjustSection}>
                  <View style={styles.priceAdjustHeader}>
                    <Text style={styles.priceAdjustLabel}>Giá hiện tại</Text>
                    <Text numeric style={[styles.priceAdjustCurrent, outOfStock && styles.priceOutOfStock]}>
                      {outOfStock ? '—' : formatPrice(product.currentPrice)}
                    </Text>
                  </View>

                  <View style={styles.priceInputRow}>
                    <TextInput
                      numeric
                      style={[
                        styles.priceInput,
                        isPriceChanged && styles.priceInputChanged,
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
                      onPress={() => {
                        handlePriceChange(product.productId, product.currentPrice);
                        handleQuantityChange(product.productId, product.availableQuantity);
                      }}
                    >
                      <Ionicons name="refresh-outline" size={13} color={Colors.primaryText} style={{ marginRight: 4 }} />
                      <Text style={styles.resetText}>Đặt lại</Text>
                    </Pressable>
                  )}
                </View>

                {/* ─── Quantity Adjustment ─── */}
                <View style={styles.qtyAdjustSection}>
                  <View style={styles.priceAdjustHeader}>
                    <Text style={styles.priceAdjustLabel}>Số lượng hiện tại</Text>
                    <Text numeric style={[styles.priceAdjustCurrent, outOfStock && styles.priceOutOfStock]}>
                      {outOfStock ? '—' : `${displayQuantity} ${product.unit}`}
                    </Text>
                  </View>

                  <View style={styles.priceInputRow}>
                    <TextInput
                      numeric
                      style={[
                        styles.priceInput,
                        isQtyChanged && styles.priceInputChanged,
                        outOfStock && styles.priceInputDisabled,
                      ]}
                      value={String(displayQuantity)}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '');
                        const num = cleaned === '' ? 0 : Number(cleaned);
                        handleQuantityChange(product.productId, num);
                      }}
                      keyboardType="numeric"
                      placeholder="Nhập số lượng..."
                      placeholderTextColor={Colors.textMuted}
                      editable={!outOfStock}
                    />
                    <Text style={styles.priceInputCurrency}>{product.unit}</Text>
                  </View>
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

// ─── Styles (matching MarketKiosksScreen) ─────────────────────────────────────

const styles = StyleSheet.create({
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
