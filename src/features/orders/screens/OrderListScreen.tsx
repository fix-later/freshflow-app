import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
const MOCK_DEAL_LIMIT = 12;
const MOCK_DEAL_DISCOUNTS = [8, 10, 12, 15, 18, 20] as const;
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

export function OrderListScreen() {
  const navigation = useNavigation<OrdersNav>();
  const productListRef = useRef<FlatList<MarketProductDto>>(null);
  const { cart, cartCount, addToCart, removeFromCart, updateItemQty, selectedMarketId, setSelectedMarketId } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDto[]>([]);
  const [marketProducts, setMarketProducts] = useState<MarketProductDto[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDealsOnly, setShowDealsOnly] = useState(false);
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
    setMarketProducts([]);
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
  const categoryImageById = useMemo(() => {
    const imageById = new Map<string, string>();
    const productWithImage = marketProducts.find((marketProduct) => (
      Boolean(productMetadata.get(marketProduct.productId)?.imageUrl)
    ));

    imageById.set(
      '__all__',
      productWithImage
        ? productMetadata.get(productWithImage.productId)?.imageUrl ?? fallbackImage(0)
        : fallbackImage(0),
    );

    rootCategories.forEach((rootCategory, index) => {
      const categoryIds = new Set([
        rootCategory.id,
        ...categories
          .filter((category) => category.parentId === rootCategory.id)
          .map((category) => category.id),
      ]);
      const matchingProduct = marketProducts.find((marketProduct) => {
        const metadata = productMetadata.get(marketProduct.productId);
        if (!metadata?.imageUrl || !metadata.categoryId) return false;
        return categoryIds.has(metadata.categoryId);
      });

      imageById.set(
        rootCategory.id,
        matchingProduct
          ? productMetadata.get(matchingProduct.productId)?.imageUrl ?? fallbackImage(index + 1)
          : fallbackImage(index + 1),
      );
    });

    return imageById;
  }, [categories, marketProducts, productMetadata, rootCategories]);
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

  const sheetSlideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (showMarketPicker) {
      sheetSlideAnim.setValue(400);
      Animated.spring(sheetSlideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [showMarketPicker, sheetSlideAnim]);

  const closeMarketPicker = () => {
    Animated.timing(sheetSlideAnim, {
      toValue: 400,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowMarketPicker(false);
      setMarketSearchQuery('');
    });
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

  const isDiscoveryMode = searchQuery.trim().length === 0
    && selectedRootId === null
    && selectedChildId === null
    && !showDealsOnly;

  // Temporary storefront curation until the pricing API exposes campaigns.
  // Keeping this as a bounded subset ensures "Xem tất cả" opens deals only,
  // instead of accidentally falling back to the full market assortment.
  const dealProducts = useMemo(() => {
    const availableProducts = marketProducts
      .filter((product) => product.availableQuantity > 0)
      .sort((left, right) => left.currentPrice - right.currentPrice);
    const dealCount = Math.min(
      availableProducts.length,
      MOCK_DEAL_LIMIT,
      Math.max(6, Math.ceil(availableProducts.length * 0.35)),
    );
    return availableProducts.slice(0, dealCount);
  }, [marketProducts]);
  const dealDiscountById = useMemo(
    () => new Map(dealProducts.map((product, index) => [
      product.marketProductId,
      MOCK_DEAL_DISCOUNTS[index % MOCK_DEAL_DISCOUNTS.length],
    ])),
    [dealProducts],
  );
  const featuredProducts = dealProducts.slice(0, 6);
  const displayedProducts = showDealsOnly ? dealProducts : filteredProducts;

  const heroProducts = featuredProducts.slice(0, 3);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    if (selectedMarketId) await loadProductsForMarket(selectedMarketId);
    setRefreshing(false);
  }, [loadInitialData, loadProductsForMarket, selectedMarketId]);

  const selectRootCategory = (categoryId: string | null) => {
    setShowDealsOnly(false);
    setSelectedRootId(categoryId);
    setSelectedChildId(null);
  };

  const updateSearchQuery = (value: string) => {
    setShowDealsOnly(false);
    setSearchQuery(value);
  };

  const showAllDeals = () => {
    setShowDealsOnly(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        productListRef.current?.scrollToOffset({ offset: 300, animated: true });
      });
    });
  };

  const returnToStorefront = () => {
    setShowDealsOnly(false);
    setSearchQuery('');
    setSelectedRootId(null);
    setSelectedChildId(null);
    requestAnimationFrame(() => {
      productListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
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

  const renderProductCard = (
    item: MarketProductDto,
    horizontal = false,
  ) => {
    const favorite = isFavorite(item.marketProductId);
    const quantity = cart.find((cartItem) => cartItem.id === item.marketProductId)?.qty ?? 0;
    const imageUrl = resolveImage(item);
    const dealDiscount = dealDiscountById.get(item.marketProductId);

    return (
      <Pressable
        style={[styles.productCard, horizontal && styles.productCardHorizontal]}
        onPress={() => void openProductDetail(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.productName}, ${formatPrice(item.currentPrice)} mỗi ${item.unit}`}
      >
        <View style={styles.productImageWrap}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
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
          {item.availableQuantity > 0 && dealDiscount ? (
            <View style={styles.dealBadge}>
              <Ionicons name="pricetag" size={9} color={Colors.tertiary} />
              <Text style={styles.dealBadgeText}>Giảm {dealDiscount}%</Text>
            </View>
          ) : item.availableQuantity > 0 ? (
            <View style={styles.freshBadge}>
              <Ionicons name="sparkles" size={10} color={Colors.primaryText} />
              <Text style={styles.freshBadgeText}>Tươi hôm nay</Text>
            </View>
          ) : (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Hết hàng</Text>
            </View>
          )}
        </View>

        <View style={styles.productMetaRow}>
          <Text style={styles.productCategory} numberOfLines={1}>
            {item.category || 'Nông sản'}
          </Text>
          <Text style={styles.stockText}>{item.availableQuantity} {item.unit}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName}
        </Text>
        <View style={styles.productFooter}>
          <View style={styles.priceBlock}>
            <Text numeric style={styles.productPrice}>{formatPrice(item.currentPrice)}</Text>
            <Text style={styles.productUnit}>
              /{item.unit}{item.sellingUnit?.weightKg ? ` (~${item.sellingUnit.weightKg}kg)` : ''}
            </Text>
          </View>

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
                <Ionicons name="remove" size={16} color={Colors.deepTeal} />
              </Pressable>
              <Text numeric style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                style={[styles.quantityButton, styles.quantityButtonAdd]}
                disabled={quantity >= item.availableQuantity}
                onPress={(event) => {
                  event.stopPropagation();
                  addProduct(item);
                }}
              >
                <Ionicons name="add" size={16} color={Colors.onPrimary} />
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
              accessibilityLabel={`Thêm ${item.productName} vào giỏ`}
            >
              <Ionicons
                name="add"
                size={21}
                color={item.availableQuantity > 0 ? Colors.onPrimary : Colors.textMuted}
              />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const renderProduct = ({ item }: { item: MarketProductDto }) => (
    renderProductCard(item)
  );

  const listHeader = (
    <>
      <View style={styles.brandHeader}>
        <BrandLogo width={108} />
        <View style={styles.headerActions}>
          <Pressable
            style={styles.marketHeaderPill}
            onPress={() => setShowMarketPicker(true)}
            accessibilityLabel="Chọn chợ đầu mối"
          >
            <Ionicons name="location" size={15} color={Colors.primaryText} />
            <Text style={styles.marketHeaderText} numberOfLines={1}>
              {selectedMarket?.name ?? 'Chọn chợ'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.primaryText} />
          </Pressable>
          <Pressable
            style={styles.notificationButton}
            accessibilityLabel="Thông báo"
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.deepTeal} />
            {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={updateSearchQuery}
            placeholder="Tìm sản phẩm cho bếp của bạn"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => updateSearchQuery('')}>
              <Ionicons name="close-circle" size={19} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.serviceStrip}>
        <View style={styles.serviceItem}>
          <Ionicons name="sunny-outline" size={17} color={Colors.primaryText} />
          <Text style={styles.serviceText}>Giao từ 6h</Text>
        </View>
        <View style={styles.serviceDivider} />
        <View style={styles.serviceItem}>
          <Ionicons name="document-text-outline" size={17} color={Colors.primaryText} />
          <Text style={styles.serviceText}>VAT đầy đủ</Text>
        </View>
        <View style={styles.serviceDivider} />
        <View style={styles.serviceItem}>
          <Ionicons name="shield-checkmark-outline" size={17} color={Colors.primaryText} />
          <Text style={styles.serviceText}>Đã kiểm định</Text>
        </View>
      </View>

      <View style={styles.categoryHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>MUA SẮM NHANH</Text>
          <Text style={styles.sectionTitle}>Danh mục nổi bật</Text>
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
              style={styles.rootCategory}
              onPress={() => selectRootCategory(isAll ? null : item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.rootCategoryIcon, active && styles.rootCategoryIconActive]}>
                <Image
                  source={{ uri: categoryImageById.get(item.id) ?? fallbackImage(0) }}
                  style={styles.rootCategoryImage}
                  resizeMode="cover"
                />
                {active ? (
                  <View style={styles.rootCategorySelectedBadge}>
                    <Ionicons name="checkmark" size={11} color={Colors.deepTeal} />
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.rootCategoryText, active && styles.rootCategoryTextActive]}
                numberOfLines={2}
              >
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
              onPress={() => {
                setShowDealsOnly(false);
                setSelectedChildId(null);
              }}
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
                  onPress={() => {
                    setShowDealsOnly(false);
                    setSelectedChildId(category.id);
                  }}
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

      {isDiscoveryMode && selectedMarketId && featuredProducts.length > 0 ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <View style={styles.heroKicker}>
                <Ionicons name="leaf" size={13} color={Colors.deepTeal} />
                <Text style={styles.heroKickerText}>TỪ CHỢ ĐẾN BẾP</Text>
              </View>
              <Text style={styles.heroTitle}>Nguyên liệu tươi,{`\n`}bếp vận hành khỏe</Text>
              <Text style={styles.heroSubtitle}>
                Giá theo chợ mỗi ngày, nguồn hàng rõ ràng và giao đúng khung giờ.
              </Text>
              <Pressable
                style={styles.heroButton}
                disabled={heroProducts.length === 0}
                onPress={() => heroProducts[0] && openProductDetail(heroProducts[0])}
              >
                <Text style={styles.heroButtonText}>Khám phá ngay</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.deepTeal} />
              </Pressable>
            </View>
            <View style={styles.heroVisual}>
              <View style={styles.heroOrbLarge} />
              <View style={styles.heroOrbSmall} />
              {heroProducts.map((product, index) => (
                <Image
                  key={product.marketProductId}
                  source={{ uri: resolveImage(product) }}
                  style={[
                    styles.heroProductImage,
                    index === 0
                      ? styles.heroProductImage0
                      : index === 1
                        ? styles.heroProductImage1
                        : styles.heroProductImage2,
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>

          {featuredProducts.length > 0 ? (
            <View style={styles.featuredSection}>
              <View style={styles.featuredHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>GỢI Ý CHO BẾP</Text>
                  <Text style={styles.sectionTitle}>Giá tốt hôm nay</Text>
                </View>
                <Pressable
                  style={styles.featuredCountPill}
                  onPress={showAllDeals}
                  accessibilityRole="button"
                  accessibilityLabel="Xem tất cả sản phẩm giá tốt hôm nay"
                >
                  <Text style={styles.featuredCountText}>Xem tất cả</Text>
                  <Ionicons name="chevron-forward" size={13} color={Colors.primaryText} />
                </Pressable>
              </View>
              <FlatList
                horizontal
                data={featuredProducts}
                keyExtractor={(item) => `featured-${item.marketProductId}`}
                renderItem={({ item }) => renderProductCard(item, true)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              />
            </View>
          ) : null}

        </>
      ) : null}

      {showDealsOnly ? (
        <View style={styles.dealNavigationRow}>
          <Pressable
            style={styles.backToStorefrontButton}
            onPress={returnToStorefront}
            accessibilityRole="button"
            accessibilityLabel="Quay về trang chủ mua sắm"
          >
            <Ionicons name="arrow-back" size={16} color={Colors.deepTeal} />
            <Text style={styles.backToStorefrontText}>Về trang chủ</Text>
          </Pressable>
          <View style={styles.mockDealNotice}>
            <Ionicons name="flash" size={12} color={Colors.tertiary} />
            <Text style={styles.mockDealNoticeText}>{dealProducts.length} ưu đãi hôm nay</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>
            {showDealsOnly
              ? 'ƯU ĐÃI TRONG NGÀY'
              : isDiscoveryMode
                ? 'DANH MỤC ĐẦY ĐỦ'
                : 'KẾT QUẢ PHÙ HỢP'}
          </Text>
          <Text style={styles.sectionTitle}>
            {showDealsOnly
              ? 'Giá tốt hôm nay'
              : selectedChildId
                ? categoryById.get(selectedChildId)?.name ?? 'Sản phẩm'
                : selectedRoot?.name ?? (searchQuery ? 'Kết quả tìm kiếm' : 'Tất cả sản phẩm')}
          </Text>
        </View>
        <View style={styles.resultCountPill}>
          <Text style={styles.resultText}>{displayedProducts.length} mặt hàng</Text>
        </View>
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
          ref={productListRef}
          data={productsLoading ? [] : displayedProducts}
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
        animationType="fade"
        transparent
        onRequestClose={closeMarketPicker}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMarketPicker} />
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetSlideAnim }] },
            ]}
          >
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
                        setShowDealsOnly(false);
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
          </Animated.View>
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
  screen: { flex: 1, backgroundColor: Colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  listContent: { paddingBottom: 122, backgroundColor: Colors.background },
  brandHeader: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  marketHeaderPill: {
    maxWidth: 126,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  marketHeaderText: {
    flexShrink: 1,
    fontSize: 11,
    color: Colors.primaryText,
    fontFamily: Fonts.semibold,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
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
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
  },
  searchBox: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  serviceStrip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  serviceDivider: { width: 1, height: 18, backgroundColor: Colors.border },
  serviceText: { fontSize: 9, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 22,
    backgroundColor: Colors.surface,
  },
  sectionEyebrow: {
    marginBottom: 4,
    fontSize: 9,
    letterSpacing: 1.1,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
  },
  sectionTitle: { fontSize: 19, fontFamily: Fonts.bold, color: Colors.textPrimary },
  resetFilterText: { fontSize: 12, color: Colors.primaryText, fontFamily: Fonts.semibold },
  rootCategoryList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
  },
  rootCategory: {
    width: 82,
    height: 108,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 3,
  },
  rootCategoryIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  rootCategoryIconActive: {
    borderWidth: 2.5,
    borderColor: Colors.primaryText,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  rootCategoryImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.surfaceContainerLow,
  },
  rootCategorySelectedBadge: {
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
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
  },
  rootCategoryTextActive: { color: Colors.primaryText, fontFamily: Fonts.bold },
  childSection: { paddingBottom: 14, backgroundColor: Colors.surface },
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
  heroCard: {
    minHeight: 234,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: Colors.deepTeal,
  },
  heroCopy: { width: '64%', zIndex: 2 },
  heroKicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  heroKickerText: { fontSize: 8, letterSpacing: 0.8, color: Colors.deepTeal, fontFamily: Fonts.bold },
  heroTitle: {
    marginTop: 13,
    fontSize: 21,
    lineHeight: 27,
    color: Colors.white,
    fontFamily: Fonts.extraBold,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 16,
    color: '#D7E7E8',
    fontFamily: Fonts.medium,
  },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: Colors.primary,
  },
  heroButtonText: { fontSize: 10, color: Colors.deepTeal, fontFamily: Fonts.bold },
  heroVisual: { position: 'absolute', top: 0, right: 0, width: '42%', height: '100%' },
  heroOrbLarge: {
    position: 'absolute',
    top: 22,
    right: -46,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(80,240,163,0.16)',
  },
  heroOrbSmall: {
    position: 'absolute',
    bottom: -24,
    left: 4,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroProductImage: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Colors.white,
    backgroundColor: Colors.surface,
  },
  heroProductImage0: { top: 28, right: 10, transform: [{ rotate: '7deg' }] },
  heroProductImage1: { top: 94, right: 60, transform: [{ rotate: '-8deg' }] },
  heroProductImage2: { bottom: 18, right: 2, transform: [{ rotate: '5deg' }] },
  featuredSection: { paddingTop: 26 },
  featuredHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
  },
  featuredCountText: { fontSize: 9, color: Colors.primaryText, fontFamily: Fonts.bold },
  featuredList: { paddingHorizontal: 16, paddingBottom: 6, gap: 10 },
  dealNavigationRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backToStorefrontButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C9F4DD',
  },
  backToStorefrontText: { fontSize: 10, color: Colors.deepTeal, fontFamily: Fonts.bold },
  mockDealNotice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mockDealNoticeText: { fontSize: 9, color: Colors.tertiary, fontFamily: Fonts.semibold },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 14,
  },
  resultCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultText: { fontSize: 9, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  productRow: { paddingHorizontal: 16, gap: 10, alignItems: 'stretch' },
  productCard: {
    flex: 1,
    minWidth: 0,
    marginBottom: 12,
    padding: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.deepTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },
  productCardHorizontal: { width: 176, flex: 0 },
  productImageWrap: {
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
  },
  productImage: { width: '100%', height: '100%' },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  freshBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: 'rgba(229,252,238,0.94)',
  },
  freshBadgeText: { fontSize: 7, color: Colors.primaryText, fontFamily: Fonts.bold },
  dealBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: 'rgba(255,251,235,0.96)',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dealBadgeText: { fontSize: 7, color: Colors.tertiary, fontFamily: Fonts.bold },
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
  productMetaRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  productCategory: {
    flex: 1,
    fontSize: 8,
    color: Colors.primaryText,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },
  productName: {
    minHeight: 38,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
  },
  productFooter: {
    minHeight: 36,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  priceBlock: { flex: 1, minWidth: 0 },
  productPrice: { fontSize: 14, color: Colors.deepTeal, fontFamily: Fonts.bold },
  productUnit: { marginTop: 1, fontSize: 8, color: Colors.textMuted },
  stockText: { fontSize: 8, color: Colors.textMuted },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: Colors.primary,
  },
  addButtonDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  quantityControl: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C9F4DD',
  },
  quantityButton: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  quantityButtonAdd: { backgroundColor: Colors.primary },
  quantityValue: { minWidth: 22, textAlign: 'center', fontSize: 11, color: Colors.deepTeal, fontFamily: Fonts.bold },
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
