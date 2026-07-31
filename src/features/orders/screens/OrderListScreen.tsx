import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import LogoIconSource from '../../../../assets/images/logo/logo.svg';
import { Text, TextInput } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';
import { useCartStore } from '../../../store/cartStore';
import { useFavoritesStore } from '../../../store/favoritesStore';
import {
  type CategoryDto,
  type MarketDto,
  type MarketProductDto,
  type ProductDto,
} from '../../../types/api.types';
import { pricingApi } from '../../pricing/api/pricingApi';
import { notificationApi } from '../../notifications/api/notificationApi';
import { CartModal } from '../components/CartModal';

type OrdersNav = NativeStackNavigationProp<RestaurantOrdersStackParamList>;

const PRODUCT_PAGE_SIZE = 100;
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
  'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=600',
  'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=600',
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
];

function formatPrice(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function fallbackImage(index: number) {
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
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

async function loadAllCatalogProducts() {
  const first = await pricingApi.getProducts({ page: 1, pageSize: PRODUCT_PAGE_SIZE });
  const pageCount = Math.ceil(first.meta.total / first.meta.pageSize);
  if (pageCount <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      pricingApi.getProducts({ page: index + 2, pageSize: PRODUCT_PAGE_SIZE }),
    ),
  );
  return [first.data, ...remaining.map((page) => page.data)].flat();
}

async function loadAllMarketProducts(marketId: string) {
  const items: MarketProductDto[] = [];
  let cursor: string | undefined;

  // The endpoint is cursor-paginated. The safety cap prevents an invalid
  // backend cursor from keeping the mobile request loop alive indefinitely.
  for (let page = 0; page < 100; page += 1) {
    const result = await pricingApi.getMarketProducts(marketId, {
      cursor,
      pageSize: PRODUCT_PAGE_SIZE,
    });
    items.push(...result.items);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return items;
}

function EmptyProductImage({
  categoryName,
  size = 82,
}: {
  categoryName: string;
  size?: number;
}) {
  return (
    <View style={[styles.emptyImage, { width: size, height: size }]}>
      <Ionicons
        name={getCategoryIcon(categoryName)}
        size={Math.round(size * 0.38)}
        color={Colors.primaryText}
      />
    </View>
  );
}

export function OrderListScreen() {
  const navigation = useNavigation<OrdersNav>();
  const { cart, cartCount, addToCart, removeFromCart, updateItemQty, selectedMarketId, setSelectedMarketId } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDto[]>([]);
  const [marketProducts, setMarketProducts] = useState<MarketProductDto[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarketPicker, setShowMarketPicker] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // Lets loadInitialData read the latest selection without depending on it —
  // adding selectedMarketId to its deps would recreate the callback (and the
  // mount effect that calls it) on every market switch, re-fetching the whole
  // catalog just to check whether a market is already selected.
  const selectedMarketIdRef = useRef(selectedMarketId);
  useEffect(() => {
    selectedMarketIdRef.current = selectedMarketId;
  }, [selectedMarketId]);

  const loadInitialData = useCallback(async () => {
    try {
      setError(null);
      const [marketData, categoryData, productData] = await Promise.all([
        pricingApi.getMarkets(),
        pricingApi.getCategories(),
        loadAllCatalogProducts(),
      ]);

      setMarkets(marketData.filter((market) => market.isActive));
      setCategories(categoryData.filter((category) => category.isActive));
      setCatalogProducts(productData.filter((product) => !product.isDeleted));

      // First time this session (no market chosen yet) — prompt the user to pick one
      // explicitly instead of silently defaulting to the first active market.
      if (!selectedMarketIdRef.current) {
        setShowMarketPicker(true);
      }
    } catch {
      setError('Không thể tải danh mục mua sắm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProductsForMarket = useCallback(async (marketId: string) => {
    setProductsLoading(true);
    try {
      setMarketProducts(await loadAllMarketProducts(marketId));
      setError(null);
    } catch {
      setMarketProducts([]);
      setError('Không thể tải sản phẩm của chợ đã chọn.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedMarketId) void loadProductsForMarket(selectedMarketId);
  }, [loadProductsForMarket, selectedMarketId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      notificationApi
        .list({ pageSize: 1, isRead: false })
        .then((page) => {
          if (active) setHasUnreadNotifications(page.data.length > 0);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, []),
  );

  const productMetadata = useMemo(
    () => new Map(catalogProducts.map((product) => [product.id, product])),
    [catalogProducts],
  );
  const stockByMarketProductId = useMemo(
    () => Object.fromEntries(marketProducts.map((product) => [product.marketProductId, product.availableQuantity])),
    [marketProducts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const rootCategories = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories],
  );
  const selectedRoot = selectedRootId ? categoryById.get(selectedRootId) ?? null : null;
  const childCategories = useMemo(
    () => categories.filter((category) => category.parentId === selectedRootId),
    [categories, selectedRootId],
  );

  const selectedMarket = markets.find((market) => market.id === selectedMarketId) ?? null;

  const filteredMarkets = useMemo(() => {
    const query = marketSearchQuery.trim().toLocaleLowerCase('vi-VN');
    if (!query) return markets;
    return markets.filter(
      (market) =>
        market.name.toLocaleLowerCase('vi-VN').includes(query) ||
        market.address?.toLocaleLowerCase('vi-VN').includes(query) ||
        market.location?.toLocaleLowerCase('vi-VN').includes(query),
    );
  }, [markets, marketSearchQuery]);

  const closeMarketPicker = () => {
    setShowMarketPicker(false);
    setMarketSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi-VN');
    const allowedCategoryIds = new Set<string>();

    if (selectedChildId) {
      allowedCategoryIds.add(selectedChildId);
    } else if (selectedRootId) {
      allowedCategoryIds.add(selectedRootId);
      categories
        .filter((category) => category.parentId === selectedRootId)
        .forEach((category) => allowedCategoryIds.add(category.id));
    }

    return marketProducts.filter((marketProduct) => {
      const metadata = productMetadata.get(marketProduct.productId);
      const matchesSearch =
        !query ||
        marketProduct.productName.toLocaleLowerCase('vi-VN').includes(query) ||
        marketProduct.category?.toLocaleLowerCase('vi-VN').includes(query);
      if (!matchesSearch) return false;
      if (allowedCategoryIds.size === 0) return true;

      if (metadata?.categoryId) return allowedCategoryIds.has(metadata.categoryId);
      const allowedNames = Array.from(allowedCategoryIds)
        .map((id) => categoryById.get(id)?.name)
        .filter((name): name is string => Boolean(name));
      return marketProduct.category !== null && allowedNames.includes(marketProduct.category);
    });
  }, [
    categories,
    categoryById,
    marketProducts,
    productMetadata,
    searchQuery,
    selectedChildId,
    selectedRootId,
  ]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    if (selectedMarketId) await loadProductsForMarket(selectedMarketId);
    setRefreshing(false);
  }, [loadInitialData, loadProductsForMarket, selectedMarketId]);

  const selectRootCategory = (categoryId: string | null) => {
    setSelectedRootId(categoryId);
    setSelectedChildId(null);
  };

  const resolveImage = useCallback(
    (product: MarketProductDto) => {
      const index = marketProducts.findIndex((item) => item.marketProductId === product.marketProductId);
      return productMetadata.get(product.productId)?.imageUrl || fallbackImage(Math.max(index, 0));
    },
    [marketProducts, productMetadata],
  );

  const addProduct = (product: MarketProductDto, quantity = 1) => {
    if (product.availableQuantity <= 0 || quantity <= 0) return;
    const existing = cart.find((item) => item.id === product.marketProductId);
    const nextQuantity = Math.min(product.availableQuantity, (existing?.qty ?? 0) + quantity);

    if (existing) {
      updateItemQty(product.marketProductId, nextQuantity);
      return;
    }

    addToCart({
      id: product.marketProductId,
      name: product.productName,
      market: selectedMarket?.name ?? '',
      unit: product.unit,
      price: product.currentPrice,
      image: resolveImage(product),
    });
    if (nextQuantity > 1) updateItemQty(product.marketProductId, nextQuantity);
  };

  const toggleProductFavorite = (product: MarketProductDto) => {
    toggleFavorite({
      marketProductId: product.marketProductId,
      productId: product.productId,
      productName: product.productName,
      imageUrl: resolveImage(product),
      marketId: product.marketId,
      marketName: selectedMarket?.name ?? '',
      category: product.category,
      unit: product.unit,
      currentPrice: product.currentPrice,
      availableQuantity: product.availableQuantity,
      createdAt: new Date().toISOString(),
    });
  };

  const openProductDetail = (product: MarketProductDto) => {
    const img = resolveImage(product);
    const desc = productMetadata.get(product.productId)?.description;
    navigation.navigate('ProductDetail', {
      product: {
        marketProductId: product.marketProductId,
        productId: product.productId,
        productName: product.productName,
        imageUrl: img || null,
        marketId: product.marketId,
        marketName: selectedMarket?.name ?? '',
        category: product.category,
        unit: product.unit,
        currentPrice: product.currentPrice,
        availableQuantity: product.availableQuantity,
        description: desc || null,
      },
    });
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) return;
    setShowCart(false);
    navigation.navigate('CreateOrder', {
      items: cart.map((item) => ({
        marketProductId: item.id,
        productName: item.name,
        marketName: item.market,
        unit: item.unit,
        quantity: item.qty,
        unitPrice: item.price,
        image: item.image,
        note: item.note,
      })),
    });
  };

  const renderProduct = ({ item, index }: { item: MarketProductDto; index: number }) => {
    const metadata = productMetadata.get(item.productId);
    const favorite = isFavorite(item.marketProductId);
    const quantity = cart.find((cartItem) => cartItem.id === item.marketProductId)?.qty ?? 0;
    const imageUrl = metadata?.imageUrl;

    return (
      <Pressable style={styles.productCard} onPress={() => void openProductDetail(item)}>
        <View style={styles.productImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <EmptyProductImage categoryName={item.category ?? ''} />
          )}
          <Pressable
            style={styles.favoriteButton}
            onPress={(event) => {
              event.stopPropagation();
              toggleProductFavorite(item);
            }}
            accessibilityLabel={favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          >
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={18}
              color={favorite ? Colors.danger : Colors.deepTeal}
            />
          </Pressable>
          {item.availableQuantity <= 0 ? (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Hết hàng</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.productCategory} numberOfLines={1}>
          {item.category || 'Chưa phân loại'}
        </Text>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text numeric style={styles.productPrice}>
          {formatPrice(item.currentPrice)}
          <Text style={styles.productUnit}>/{item.unit}</Text>
        </Text>
        <Text style={styles.stockText}>Còn {item.availableQuantity} {item.unit}</Text>

        {quantity > 0 ? (
          <View style={styles.quantityControl}>
            <Pressable
              style={styles.quantityButton}
              onPress={(event) => {
                event.stopPropagation();
                if (quantity <= 1) removeFromCart(item.marketProductId);
                else updateItemQty(item.marketProductId, quantity - 1);
              }}
            >
              <Ionicons name="remove" size={17} color={Colors.deepTeal} />
            </Pressable>
            <Text numeric style={styles.quantityValue}>{quantity}</Text>
            <Pressable
              style={styles.quantityButton}
              disabled={quantity >= item.availableQuantity}
              onPress={(event) => {
                event.stopPropagation();
                addProduct(item);
              }}
            >
              <Ionicons name="add" size={17} color={Colors.deepTeal} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[
              styles.addButton,
              item.availableQuantity <= 0 && styles.addButtonDisabled,
            ]}
            disabled={item.availableQuantity <= 0}
            onPress={(event) => {
              event.stopPropagation();
              addProduct(item);
            }}
          >
            <Ionicons
              name="add"
              size={18}
              color={item.availableQuantity > 0 ? Colors.onPrimary : Colors.textMuted}
            />
            <Text
              style={[
                styles.addButtonText,
                item.availableQuantity <= 0 && styles.addButtonTextDisabled,
              ]}
            >
              Thêm
            </Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  const listHeader = (
    <>
      <View style={styles.brandHeader}>
        <BrandLogo width={132} />
        <Pressable
          style={styles.notificationButton}
          accessibilityLabel="Thông báo"
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={23} color={Colors.deepTeal} />
          {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>

      <Pressable style={styles.marketSelector} onPress={() => setShowMarketPicker(true)}>
        <View style={styles.marketIcon}>
          <Ionicons name="storefront-outline" size={18} color={Colors.primaryText} />
        </View>
        <View style={styles.marketTextWrap}>
          <Text style={styles.marketLabel}>Đang mua tại</Text>
          <Text style={styles.marketName} numberOfLines={1}>
            {selectedMarket?.name ?? 'Chọn chợ'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
      </Pressable>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm rau, thịt, hải sản..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={19} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.categoryHeader}>
        <View>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <Text style={styles.sectionSubtitle}>Chọn nhóm hàng bạn cần</Text>
        </View>
        {selectedRootId ? (
          <Pressable onPress={() => selectRootCategory(null)}>
            <Text style={styles.resetFilterText}>Xem tất cả</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={[{ id: '__all__', name: 'Tất cả' }, ...rootCategories]}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rootCategoryList}
        renderItem={({ item }) => {
          const isAll = item.id === '__all__';
          const active = isAll ? selectedRootId === null : selectedRootId === item.id;
          return (
            <Pressable
              style={[styles.rootCategory, active && styles.rootCategoryActive]}
              onPress={() => selectRootCategory(isAll ? null : item.id)}
            >
              <View style={[styles.rootCategoryIcon, active && styles.rootCategoryIconActive]}>
                <Ionicons
                  name={isAll ? 'grid-outline' : getCategoryIcon(item.name)}
                  size={21}
                  color={active ? Colors.onPrimary : Colors.primaryText}
                />
              </View>
              <Text style={[styles.rootCategoryText, active && styles.rootCategoryTextActive]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {selectedRoot && childCategories.length > 0 ? (
        <View style={styles.childSection}>
          <View style={styles.breadcrumb}>
            <Ionicons name="folder-open-outline" size={16} color={Colors.primaryText} />
            <Text style={styles.breadcrumbText}>{selectedRoot.name}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            <Text style={styles.breadcrumbHint}>Danh mục con</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childCategoryList}
          >
            <Pressable
              style={[styles.childChip, selectedChildId === null && styles.childChipActive]}
              onPress={() => setSelectedChildId(null)}
            >
              <Text
                style={[
                  styles.childChipText,
                  selectedChildId === null && styles.childChipTextActive,
                ]}
              >
                Tất cả {selectedRoot.name}
              </Text>
            </Pressable>
            {childCategories.map((category) => {
              const active = selectedChildId === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[styles.childChip, active && styles.childChipActive]}
                  onPress={() => setSelectedChildId(category.id)}
                >
                  <Text style={[styles.childChipText, active && styles.childChipTextActive]}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.resultHeader}>
        <Text style={styles.resultText}>
          {filteredProducts.length} mặt hàng
        </Text>
        {selectedChildId ? (
          <Text style={styles.resultCategory} numberOfLines={1}>
            {categoryById.get(selectedChildId)?.name}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
          <Text style={styles.loadingText}>Đang tải cửa hàng...</Text>
        </View>
      ) : (
        <FlatList
          data={productsLoading ? [] : filteredProducts}
          keyExtractor={(item) => item.marketProductId}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              colors={[Colors.primary]}
              tintColor={Colors.primaryText}
            />
          }
          ListEmptyComponent={
            productsLoading ? (
              <View style={styles.catalogState}>
                <ActivityIndicator size="large" color={Colors.primaryText} />
                <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
              </View>
            ) : error ? (
              <View style={styles.catalogState}>
                <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={() => void refresh()}>
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
              </View>
            ) : !selectedMarketId ? (
              <View style={styles.catalogState}>
                <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Hãy chọn chợ để bắt đầu mua sắm</Text>
                <Text style={styles.emptySubtitle}>
                  Giá và tồn kho được hiển thị theo từng chợ đầu mối.
                </Text>
                <Pressable style={styles.retryButton} onPress={() => setShowMarketPicker(true)}>
                  <Text style={styles.retryText}>Chọn chợ</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.catalogState}>
                <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Không tìm thấy mặt hàng</Text>
                <Text style={styles.emptySubtitle}>
                  Thử từ khóa khác hoặc chọn lại danh mục.
                </Text>
              </View>
            )
          }
        />
      )}

      {cartCount > 0 && !showCart ? (
        <Pressable style={styles.cartFab} onPress={() => setShowCart(true)}>
          <Ionicons name="cart-outline" size={24} color={Colors.onPrimary} />
          <View style={styles.cartFabBadge}>
            <Text numeric style={styles.cartFabBadgeText}>{cartCount}</Text>
          </View>
        </Pressable>
      ) : null}

      <Modal
        visible={showMarketPicker}
        animationType="slide"
        transparent
        onRequestClose={closeMarketPicker}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMarketPicker} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderIcon}>
                <LogoIconSource width={50} height={50} />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>
                  {selectedMarketId ? 'Đổi chợ đầu mối' : 'Chọn chợ đầu mối'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedMarketId
                    ? 'Giá và tồn kho được hiển thị riêng theo từng chợ.'
                    : 'Chọn chợ bạn muốn mua sắm hôm nay để bắt đầu.'}
                </Text>
              </View>
            </View>

            {markets.length > 4 ? (
              <View style={styles.marketSearchBox}>
                <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.marketSearchInput}
                  value={marketSearchQuery}
                  onChangeText={setMarketSearchQuery}
                  placeholder="Tìm chợ theo tên hoặc địa chỉ..."
                  placeholderTextColor={Colors.textMuted}
                />
                {marketSearchQuery ? (
                  <Pressable onPress={() => setMarketSearchQuery('')}>
                    <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredMarkets.length === 0 ? (
                <View style={styles.marketEmptyState}>
                  <Ionicons name="search-outline" size={32} color={Colors.outline} />
                  <Text style={styles.marketEmptyText}>Không tìm thấy chợ phù hợp.</Text>
                </View>
              ) : (
                filteredMarkets.map((market) => {
                  const active = market.id === selectedMarketId;
                  return (
                    <Pressable
                      key={market.id}
                      style={[styles.marketOption, active && styles.marketOptionActive]}
                      onPress={() => {
                        setSelectedMarketId(market.id);
                        closeMarketPicker();
                      }}
                    >
                      <View style={[styles.marketOptionIcon, active && styles.marketOptionIconActive]}>
                        <Ionicons
                          name="storefront-outline"
                          size={21}
                          color={active ? Colors.onPrimary : Colors.primaryText}
                        />
                      </View>
                      <View style={styles.marketOptionText}>
                        <Text style={styles.marketOptionName}>{market.name}</Text>
                        <Text style={styles.marketOptionAddress} numberOfLines={1}>
                          {market.address || market.location || 'Chưa cập nhật địa chỉ'}
                        </Text>
                      </View>
                      {active ? (
                        <View style={styles.marketOptionCheckBadge}>
                          <Ionicons name="checkmark" size={15} color={Colors.onPrimary} />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={proceedToCheckout}
        stockByMarketProductId={stockByMarketProductId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  listContent: { paddingBottom: 118 },
  brandHeader: {
    minHeight: 68,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  searchBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  marketSelector: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  marketIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  marketTextWrap: { flex: 1 },
  marketLabel: { fontSize: 10, color: Colors.textMuted },
  marketName: { marginTop: 1, fontSize: 14, color: Colors.deepTeal, fontFamily: Fonts.semibold },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.deepTeal },
  sectionSubtitle: { marginTop: 3, fontSize: 12, color: Colors.textSecondary },
  resetFilterText: { fontSize: 12, color: Colors.primaryText, fontFamily: Fonts.semibold },
  rootCategoryList: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  rootCategory: {
    width: 88,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rootCategoryActive: { backgroundColor: Colors.deepTeal, borderColor: Colors.deepTeal },
  rootCategoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  rootCategoryIconActive: { backgroundColor: Colors.primary },
  rootCategoryText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontFamily: Fonts.semibold,
  },
  rootCategoryTextActive: { color: Colors.white },
  childSection: { marginBottom: 8 },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  breadcrumbText: { fontSize: 12, color: Colors.primaryText, fontFamily: Fonts.semibold },
  breadcrumbHint: { fontSize: 11, color: Colors.textMuted },
  childCategoryList: { paddingHorizontal: 16, gap: 8 },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  childChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  childChipText: { fontSize: 12, color: Colors.textSecondary, fontFamily: Fonts.medium },
  childChipTextActive: { color: Colors.onPrimary, fontFamily: Fonts.semibold },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  resultText: { fontSize: 13, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  resultCategory: { maxWidth: '55%', fontSize: 12, color: Colors.primaryText },
  productRow: { paddingHorizontal: 16, gap: 10 },
  productCard: {
    flex: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productImageWrap: {
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
  },
  productImage: { width: '100%', height: '100%' },
  emptyImage: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  soldOutBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.deepTeal,
  },
  soldOutText: { fontSize: 9, color: Colors.white, fontFamily: Fonts.semibold },
  productCategory: {
    marginTop: 10,
    fontSize: 10,
    color: Colors.primaryText,
    fontFamily: Fonts.semibold,
    textTransform: 'uppercase',
  },
  productName: {
    minHeight: 40,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
  },
  productPrice: { marginTop: 6, fontSize: 15, color: Colors.deepTeal, fontFamily: Fonts.bold },
  productUnit: { fontSize: 10, color: Colors.textMuted },
  stockText: { marginTop: 3, fontSize: 10, color: Colors.textMuted },
  addButton: {
    minHeight: 36,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  addButtonDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  addButtonText: { fontSize: 12, color: Colors.onPrimary, fontFamily: Fonts.bold },
  addButtonTextDisabled: { color: Colors.textMuted },
  quantityControl: {
    minHeight: 36,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  quantityButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 13, color: Colors.deepTeal, fontFamily: Fonts.bold },
  catalogState: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
  },
  emptySubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: Colors.textMuted,
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  retryText: { fontSize: 13, color: Colors.onPrimary, fontFamily: Fonts.bold },
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
    color: Colors.white,
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    maxHeight: '78%',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.surface,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sheetHeaderIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderText: { flex: 1 },
  sheetTitle: { fontSize: 18, color: Colors.deepTeal, fontFamily: Fonts.bold },
  sheetSubtitle: { marginTop: 3, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  marketSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  marketSearchInput: { flex: 1, fontSize: 13, color: Colors.textPrimary, paddingVertical: 0 },
  marketEmptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  marketEmptyText: { fontSize: 13, color: Colors.textMuted },
  marketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  marketOptionActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  marketOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  marketOptionIconActive: { backgroundColor: Colors.primary },
  marketOptionText: { flex: 1 },
  marketOptionName: { fontSize: 14, color: Colors.deepTeal, fontFamily: Fonts.semibold },
  marketOptionAddress: { marginTop: 3, fontSize: 11, color: Colors.textMuted },
  marketOptionCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
