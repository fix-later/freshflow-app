import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { pricingApi } from '../api/pricingApi';
import { useCartStore } from '../../../store/cartStore';
import type { MarketDto, MarketProductDto, CategoryDto } from '../../../types/api.types';

// ─── Assets ────────────────────────────────
const MARKET_IMAGES: Record<string, string> = {
  'hoc-mon': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9VcUush4POrDO1s0xblyUJbyQXSnMwZpiN6IDkaZDuHbQbGtTE2qBaVQIeCZoJNolSH7CQya8wX95eNuVU4VrVl2lMxmEl5HZxL30-KkeK4rWS5sdX7EXNu0TAjaJkQ0r-bpZzwsMjztPIhQE--LBI0mQmI8Vwz_fvBhdJ4ktUJ30AizjvVIzaBovjdLw4-6_7MFVfHGIOHmhr3vclIsqKBGapup7h7z0i7ZXVN5oJuq6o3K9t5fsSZ7ZiM24t6Ag83Zw_KgOvlb2',
  'binh-dien': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHDV92Mw0xmriVCQ98teZy_68mq2FMtzpI7VrBVeS5TczAeWLengPI9SWaX9KyBKMhDqA8eYLOuqDDbwz1I6Y-d9uEUT2Sw8uXPm5HMP5O364JZe5lH2o8O3pRlo8M9XpsBSKHxJzwxRCCaMFUCXpFD2tm55GjGNcWSqJoTUcqLO9Tr1I1gxFmzBwYGec_7wWyK60d4tfBR0bPFiJ3GXSk0Ox7PNVw9AIcsCxYrg2COJPf6nlJc9RywoY2AeH0iAuuvRokP-Z5JOT8',
  'thu-duc': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBBJeu8GwORr6MXEpPwpmBLjkY_U4Vbj1I2JrohJqRXssSno30m9kG3aed-Zf9Oi3WzBh7jKSBu_eAzmENhk0jc5ATVkxXx9s1Yv4U6qAJqMRIWktDvgCJfkHkMY7tKSUCMIcn_ukvXqYbwDD07SVw4qa4_u6kgNvKGOzNGyqUHqgeMxWt9KcaKm0MpmnQSQvbQWC01nBc1SGt4RkEcBdbHiZ-xTnqLOgtNEzLsePNlvxa1cjR1R4sLDuwRNwwZLss74H4nJpfmCX6',
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'rau củ': 'leaf',
  'thịt': 'fish',
  'hải sản': 'water',
  'trái cây': 'nutrition',
  'gia vị': 'flask',
};

function getMarketImage(name: string): string | undefined {
  const key = name.toLowerCase().includes('hóc') ? 'hoc-mon'
    : name.toLowerCase().includes('bình') ? 'binh-dien'
      : name.toLowerCase().includes('thủ') ? 'thu-duc'
        : undefined;
  return key ? MARKET_IMAGES[key] : undefined;
}

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  for (const [kw, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.toLowerCase().includes(kw)) return icon as keyof typeof Ionicons.glyphMap;
  }
  return 'basket-outline';
}

const PRODUCT_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1607301405390-d831c242f59f?w=200',
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200',
  'https://images.unsplash.com/photo-1582972236019-ea4af5ffe587?w=200',
  'https://images.unsplash.com/photo-1566385101042-1a0f0b3c7b0b?w=200',
  'https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=200',
  'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?w=200',
  'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=200',
  'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=200',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200',
];

function productImage(index: number): string {
  return PRODUCT_PLACEHOLDERS[index % PRODUCT_PLACEHOLDERS.length];
}

// ─── Cart item ──────────────────────────────
interface CartItem {
  product: MarketProductDto;
  quantity: number;
}

// ─── Helpers ───────────────────────────────
function formatPrice(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Screen ────────────────────────────────
export function PriceListScreen() {
  // ── Data state ─────────────────────────
  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [products, setProducts] = useState<MarketProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [activeCategory, setActiveCategory] = useState('');

  // ── UI state ────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Global cart state ──────────────────
  const {
    cart,
    cartCount,
    cartTotal,
    addToCart: globalAddToCart,
    removeFromCart: globalRemoveFromCart,
    updateItemQty,
    updateItemNote,
    clearCart,
  } = useCartStore();

  const [showCart, setShowCart] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // ── Derived market name ─────────────────
  const selectedMarketName = useMemo(() => {
    if (!selectedMarketId) return '';
    return markets.find((m) => m.id === selectedMarketId)?.name ?? '';
  }, [selectedMarketId, markets]);

  // ── Init: load markets & categories ─────
  const loadInit = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([
        pricingApi.getMarkets(),
        pricingApi.getCategories(),
      ]);
      setMarkets(m);
      setCategories(c);
      // Auto-select first market
      if (m.length > 0 && !selectedMarketId) {
        setSelectedMarketId(m[0].id);
      }
    } catch {
      setError('Không thể tải danh sách chợ');
    }
  }, []);

  // ── Load products for selected market ───
  const loadProducts = useCallback(async (marketId: string, category?: string) => {
    try {
      setError(null);
      const result = await pricingApi.getMarketProducts(marketId, {
        category: category || undefined,
        pageSize: 100,
      });
      setProducts(result.items);
    } catch {
      setError('Không thể tải sản phẩm');
    }
  }, []);

  // ── Initial mount ───────────────────────
  useEffect(() => {
    setLoading(true);
    loadInit().finally(() => setLoading(false));
  }, []);

  // ── Re-fetch when market or category changes ──
  useEffect(() => {
    if (!selectedMarketId) return;
    setLoading(true);
    loadProducts(selectedMarketId, activeCategory).finally(() => setLoading(false));
  }, [selectedMarketId, activeCategory]);

  // ── Pull-to-refresh ─────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadInit(), selectedMarketId && loadProducts(selectedMarketId, activeCategory)]);
    setRefreshing(false);
  }, [selectedMarketId, activeCategory, loadInit, loadProducts]);

  // ── Cart helpers ────────────────────────
  const getQuantity = (productId: string) =>
    cart.find((c) => c.id === productId)?.qty ?? 0;

  const addToCart = (product: MarketProductDto) => {
    const marketName = markets.find((m) => m.id === product.marketId)?.name ?? '';
    globalAddToCart({
      id: product.marketProductId,
      name: product.productName,
      market: marketName,
      unit: product.unit,
      price: product.currentPrice,
      image: productImage(products.indexOf(product)),
    });
  };

  const removeFromCart = (productId: string) => {
    globalRemoveFromCart(productId);
  };

  // ── Render: Loading ──────────────────────
  if (loading && markets.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Error ────────────────────────
  if (error && markets.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); loadInit().finally(() => setLoading(false)); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── Header ─────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="cart" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Mua hàng</Text>
        </View>
        <Pressable
          style={styles.historyBtn}
          onPress={() => navigation.navigate('RestaurantOrders', { screen: 'OrderHistory' })}
        >
          <Ionicons name="time-outline" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* ─── Market selector ────────────────── */}
      <View style={styles.marketRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={markets}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.marketRowContent}
          renderItem={({ item }) => {
            const active = selectedMarketId === item.id;
            const img = getMarketImage(item.name);
            return (
              <Pressable
                style={[styles.marketChip, active && styles.marketChipActive]}
                onPress={() => setSelectedMarketId(item.id)}
              >
                {img ? (
                  <Image source={{ uri: img }} style={styles.marketChipImg} />
                ) : (
                  <View style={styles.marketChipIcon}>
                    <Ionicons name="storefront" size={14} color={active ? Colors.onPrimary : Colors.primary} />
                  </View>
                )}
                <Text style={[styles.marketChipText, active && styles.marketChipTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* ─── Category chips ──────────────────── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: '', label: 'Tất cả', icon: 'grid' as const },
          ...categories.map((c) => ({
            id: c.name,
            label: c.name,
            icon: getCategoryIcon(c.name) as keyof typeof Ionicons.glyphMap,
          })),
        ]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.catRow}
        renderItem={({ item }) => {
          const active = activeCategory === item.id;
          return (
            <Pressable
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setActiveCategory(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={active ? Colors.onPrimary : Colors.onSurfaceVariant}
              />
              <Text style={[styles.catText, active && styles.catTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* ─── Product list ────────────────────── */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.marketProductId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          loading && markets.length > 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingSmallText}>Đang tải sản phẩm...</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const qty = getQuantity(item.marketProductId);
          const outOfStock = item.availableQuantity <= 0;
          return (
            <View style={styles.productCard}>
              {/* Image */}
              <Image source={{ uri: productImage(index) }} style={styles.productImage} />

              {/* Info */}
              <View style={styles.productInfo}>
                <Text style={styles.productMarket}>{selectedMarketName}</Text>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.productUnit}>{item.unit}</Text>
                <Text style={styles.productPrice}>
                  {outOfStock ? 'Tạm hết' : formatPrice(item.currentPrice)}
                </Text>
              </View>

              {/* Quantity */}
              <View style={styles.qtyCol}>
                {outOfStock && (
                  <View style={styles.outOfStockBadge}>
                    <Text style={styles.outOfStockText}>Hết</Text>
                  </View>
                )}
                {!outOfStock && qty > 0 ? (
                  <>
                    <Pressable style={styles.qtyBtn} onPress={() => addToCart(item)}>
                      <Ionicons name="add" size={18} color={Colors.onPrimary} />
                    </Pressable>
                    <Text style={styles.qtyText}>{qty}</Text>
                    <Pressable style={styles.qtyBtnMinus} onPress={() => removeFromCart(item.marketProductId)}>
                      <Ionicons name="remove" size={18} color={Colors.primary} />
                    </Pressable>
                  </>
                ) : !outOfStock ? (
                  <Pressable style={styles.addBtn} onPress={() => addToCart(item)}>
                    <Ionicons name="add" size={20} color={Colors.onPrimary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={48} color={Colors.outline} />
              <Text style={styles.emptyText}>Không có sản phẩm</Text>
            </View>
          ) : null
        }
      />

      {/* ─── Error banner ──────────────────── */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={16} color="#FFF" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => selectedMarketId && loadProducts(selectedMarketId, activeCategory)}>
            <Text style={styles.errorBannerAction}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      {/* ─── FLOATING CART FAB ─────────────── */}
      {cartCount > 0 && (
        <Pressable style={styles.cartFab} onPress={() => setShowCart(true)}>
          <MaterialIcons name="shopping-cart" size={24} color="#FFF" />
          <View style={styles.cartFabBadge}>
            <Text style={styles.cartFabBadgeText}>{cartCount}</Text>
          </View>
        </Pressable>
      )}

      {/* ─── CART FULL SCREEN MODAL ────────── */}
      <Modal
        visible={showCart}
        animationType="slide"
        onRequestClose={() => setShowCart(false)}
      >
        <SafeAreaView style={styles.cartScreen} edges={['bottom']}>
          {/* Header */}
          <View style={[styles.cartScreenHeader, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => setShowCart(false)} style={styles.cartScreenClose}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
            </Pressable>
            <Text style={styles.cartScreenTitle}>Giỏ hàng ({cartCount})</Text>
            <Pressable onPress={clearCart}>
              <Text style={styles.cartScreenClear}>Xoá tất cả</Text>
            </Pressable>
          </View>

          {/* Body */}
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cartScreenList}
            renderItem={({ item }) => (
              <View style={styles.cartScreenItem}>
                <View style={styles.cartScreenItemRow}>
                  <Image source={{ uri: item.image }} style={styles.cartScreenItemImg} />
                  <View style={styles.cartScreenItemInfo}>
                    <Text style={styles.cartScreenItemName}>{item.name}</Text>
                    <Text style={styles.cartScreenItemMarket}>{item.market} • {item.unit}</Text>
                    <Text style={styles.cartScreenItemPrice}>
                      {formatPrice(item.price * item.qty)}
                    </Text>
                  </View>
                  <View style={styles.cartScreenItemQty}>
                    <Pressable style={styles.cartScreenQtyBtn} onPress={() => globalRemoveFromCart(item.id)}>
                      <MaterialIcons name="remove" size={16} color={Colors.primary} />
                    </Pressable>
                    <Text style={styles.cartScreenQtyText}>{item.qty}</Text>
                    <Pressable style={styles.cartScreenQtyBtn} onPress={() => {
                      globalAddToCart(item);
                    }}>
                      <MaterialIcons name="add" size={16} color={Colors.primary} />
                    </Pressable>
                  </View>
                </View>
                <TextInput
                  style={styles.cartScreenItemNote}
                  placeholder="Ghi chú sản phẩm (tùy chọn)..."
                  placeholderTextColor={Colors.outline}
                  value={item.note ?? ''}
                  onChangeText={(text) => updateItemNote(item.id, text)}
                  maxLength={200}
                />
              </View>
            )}
            ListHeaderComponent={
              <View style={styles.cartScreenVoucherSection}>
                <View style={styles.cartScreenVoucherRow}>
                  <MaterialIcons name="discount" size={18} color={Colors.outline} />
                  <TextInput
                    style={styles.cartScreenVoucherInput}
                    placeholder="Nhập mã giảm giá"
                    placeholderTextColor={Colors.outline}
                  />
                  <Pressable style={styles.cartScreenVoucherBtn}>
                    <Text style={styles.cartScreenVoucherBtnText}>Áp dụng</Text>
                  </Pressable>
                </View>
              </View>
            }
            ListFooterComponent={
              <View style={styles.cartScreenSummary}>
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryLabel}>Tạm tính</Text>
                  <Text style={styles.cartScreenSummaryValue}>{formatPrice(cartTotal)}</Text>
                </View>
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryLabel}>Phí vận chuyển</Text>
                  <Text style={styles.cartScreenSummaryValue}>Sẽ xác nhận sau</Text>
                </View>
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryLabel}>Giảm giá</Text>
                  <Text style={[styles.cartScreenSummaryValue, { color: Colors.error }]}>– 0đ</Text>
                </View>
                <View style={styles.cartScreenSummaryDivider} />
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryTotal}>Tổng cộng</Text>
                  <Text style={styles.cartScreenSummaryTotalValue}>{formatPrice(cartTotal)}</Text>
                </View>
              </View>
            }
          />

          {/* Footer Bar */}
          <View style={styles.cartScreenCheckoutBar}>
            <View>
              <Text style={styles.cartScreenCheckoutLabel}>Tạm tính</Text>
              <Text style={styles.cartScreenCheckoutTotal}>{formatPrice(cartTotal)}</Text>
            </View>
            <Pressable
              style={styles.cartScreenCheckoutBtn}
              onPress={() => {
                setShowCart(false);
                navigation.navigate('RestaurantOrders', {
                  screen: 'CreateOrder',
                  params: {
                    items: cart.map(item => ({
                      marketProductId: item.id,
                      productName: item.name,
                      marketName: item.market,
                      unit: item.unit,
                      quantity: item.qty,
                      unitPrice: item.price,
                      image: item.image,
                      note: item.note,
                    })),
                  },
                });
              }}
            >
              <Text style={styles.cartScreenCheckoutBtnText}>Tiến hành thanh toán</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default PriceListScreen;

// ─── Styles ────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ─── Loading / Error ───────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingSmallText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  errorText: {
    fontSize: 15,
    color: Colors.error,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    maxWidth: 260,
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
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  errorBannerAction: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // ─── Header ────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Market chips ────────────────────────
  marketRow: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  marketRowContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  marketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  marketChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  marketChipImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  marketChipIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  marketChipTextActive: {
    color: Colors.onPrimary,
  },

  // ─── Categories ────────────────────────────
  catRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  catTextActive: {
    color: Colors.onPrimary,
  },

  // ─── Product list ─────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  productMarket: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.outline,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  qtyCol: {
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnMinus: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },

  // ─── Empty state ─────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.outline,
    marginTop: 12,
  },

  // ─── Floating Cart FAB ────────────────────
  cartFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cartFabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: Colors.background,
  },
  cartFabBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── Cart Full Screen ───────────────────
  cartScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cartScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  cartScreenClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cartScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cartScreenClear: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  cartScreenList: {
    paddingBottom: 180,
  },
  cartScreenItem: {
    flexDirection: 'column',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
  },
  cartScreenItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartScreenItemNote: {
    fontSize: 12,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  cartScreenItemImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cartScreenItemInfo: {
    flex: 1,
    gap: 2,
  },
  cartScreenItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  cartScreenItemMarket: {
    fontSize: 12,
    color: Colors.outline,
  },
  cartScreenItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 4,
  },
  cartScreenItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartScreenQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cartScreenQtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    minWidth: 24,
    textAlign: 'center',
  },
  cartScreenVoucherSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cartScreenVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartScreenVoucherInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.onSurface,
  },
  cartScreenVoucherBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartScreenVoucherBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cartScreenSummary: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 12,
  },
  cartScreenSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartScreenSummaryLabel: {
    fontSize: 14,
    color: Colors.outline,
  },
  cartScreenSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  cartScreenSummaryDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },
  cartScreenSummaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cartScreenSummaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  cartScreenCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartScreenCheckoutLabel: {
    fontSize: 12,
    color: Colors.outline,
  },
  cartScreenCheckoutTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cartScreenCheckoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cartScreenCheckoutBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
