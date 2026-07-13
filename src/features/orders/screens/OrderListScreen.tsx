import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors } from "../../../constants/colors";
import { useAuthStore } from "../../../store/authStore";
import { useCartStore } from "../../../store/cartStore";
import { useFavoritesStore } from "../../../store/favoritesStore";
import { pricingApi } from "../../pricing/api/pricingApi";
import type { MarketDto, MarketProductDto, CategoryDto, PriceHistoryItemDto } from "../../../types/api.types";
import { type RestaurantOrdersStackParamList } from "../../../navigation/types";

type OrdersNav = NativeStackNavigationProp<RestaurantOrdersStackParamList>;

// ─── Configuration ─────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTAINER_PADDING = 20;
const GAP = 10;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - GAP) / 2;

// ─── Assets ────────────────────────────────
const IMAGES = {
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA1j0sl2_XxNRo9UV_2sE1VIJXj7hvh5VyS_ZOAENav4RlhZg1fuKgWvF-k88gJ65PRiD0CsNU7xRuJpgGeVAYS2xPwbz9r6dvESRu0e59SX76GLaYk5gCEG9Cz__WTSen0Ti-HV9G-lV-tLyidh4LN4YANog30q3Takv_lcHEeMLP3rIYSc02jLz8YJZMPPlc-35t39oAj9tC7SaYwSYJrcWuJFscim01qEjaMPkSAyc456XPJ9dnBo3KCbS1H8kGyE_WIH8znskon",
  hero: "https://lh3.googleusercontent.com/aida-public/AB6AXuAuxh--i7t6RopJF5JvNg2i6g91FbQxEDiOhgp8Kr6FuDFo4eWw_Wprn5PvG484b7jiJXtpwC_ObEsN-G1gSIgF_Zg-KPZBUizV--LSXB_jXC_lqeQIqDmNBGYmE9PQ4Kq93vgpWjSjLAlLhpBm7zCIr8u1Pu0IIZ2Lvx_onO8uGjBctbVnx14dW5cBrdpGbFh3pPFO0kqgbaF9i1wTYIwLO9RVEFsoFn--NB7VQ_4qQhxseqLvCIr4YfwqGBVGR1lgFopea4k8mZP6",
  hocMon:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD9VcUush4POrDO1s0xblyUJbyQXSnMwZpiN6IDkaZDuHbQbGtTE2qBaVQIeCZoJNolSH7CQya8wX95eNuVU4VrVl2lMxmEl5HZxL30-KkeK4rWS5sdX7EXNu0TAjaJkQ0r-bpZzwsMjztPIhQE--LBI0mQmI8Vwz_fvBhdJ4ktUJ30AizjvVIzaBovjdLw4-6_7MFVfHGIOHmhr3vclIsqKBGapup7h7z0i7ZXVN5oJuq6o3K9t5fsSZ7ZiM24t6Ag83Zw_KgOvlb2",
  binhDien:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBHDV92Mw0xmriVCQ98teZy_68mq2FMtzpI7VrBVeS5TczAeWLengPI9SWaX9KyBKMhDqA8eYLOuqDDbwz1I6Y-d9uEUT2Sw8uXPm5HMP5O364JZe5lH2o8O3pRlo8M9XpsBSKHxJzwxRCCaMFUCXpFD2tm55GjGNcWSqJoTUcqLO9Tr1I1gxFmzBwYGec_7wWyK60d4tfBR0bPFiJ3GXSk0Ox7PNVw9AIcsCxYrg2COJPf6nlJc9RywoY2AeH0iAuuvRokP-Z5JOT8",
  thuDuc:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDBBJeu8GwORr6MXEpPwpmBLjkY_U4Vbj1I2JrohJqRXssSno30m9kG3aed-Zf9Oi3WzBh7jKSBu_eAzmENhk0jc5ATVkxXx9s1Yv4U6qAJqMRIWktDvgCJfkHkMY7tKSUCMIcn_ukvXqYbwDD07SVw4qa4_u6kgNvKGOzNGyqUHqgeMxWt9KcaKm0MpmnQSQvbQWC01nBc1SGt4RkEcBdbHiZ-xTnqLOgtNEzLsePNlvxa1cjR1R4sLDuwRNwwZLss74H4nJpfmCX6",
  product1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCpNmioWu3RcCo5qH-wjAd9iGXCHWxP8xD-_IY3TBIaBILs7Tpo8ac69BZe7onQ7dzKiW8OH8zUJ8bVyAoGBF7UuVE0mcs6yaONEIu05slSeJ3QnUHqnkmcYWWIUTP2Oj2Iw7a5z7dGljdAbeJu4Q5oXNRYeehEJZVvP5zezZY2qELYP_CokbqXnvH5gD9vNNOs-yl5FMR-_Ad2k7hWoega8o5vAbhkpsIzzZKqIVLzy9S47RFxuENj1284aVknkGS2LovdwtgCV1BA",
  product2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDEyhTV3epLiauByDIP9phKhM_fHuH9vAu2TmxestRUK5v0khf4az4AJS39duFaruGfXT05eeVPGY37VveU4ihPbAgcHVr65Gl0DtCUE6dHNRyKUR8Mx7jYbvR6V5sKawyzEC1ul0V3_Wy1bLrMy4P22_cF6nDDEyvGLlKcR4PkBO6-aAKm6WTeOLe2J0H2q6u0ASC_yGXgjx5RPJ1ChZYnNshdAdBefR8EMLchiEEsrlpM2U6NTzknyAme3tRUgVoCS8rH1A-gAgJk",
  product3:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsMvZrC0XtIwK4EvLEtr-jTFqJE51yft4KGo4zgUQ1-xyOWlVqV54YMc9kYMl44U-W40FzqVlNkz4f5mLAc1u1rWIty0gfRnCQRa9Jb-s9fFuJo9lxcn0RZG6kpISkPff3NPrRPxYMIRN_HIJSbeYUP4N3RHBRoB9f4Hl1PS-WVRpePagJeJabcT8QIAsuezvqV0ToPfdKuwM6nug1JJNDSx0VRN0x_Z2FS6w-hvc6ntDgLhrQ6m3yDKM0sDou6a9aeZsXvPvfHmBv",
  product4:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA099yREG6DarbVMsiUA-zwfWaNtyYa_bcQTDVsshzOw399SfKW7IzohgC_HZ1N7OX0AdJnIDAfPVP4D6dSMQrGRAOO3XAQ4o8tNX-fTxx2uMmGM-3rsC23nyk5JUY8HY6GT5xrK8_9wT4VGhGTiDq2i1U4sMy-Aqfmg4Ym8SbyyZnK2PlGlNY-Eew-UEIc8cmNqzGNWOeBgs-cUGn0OTs_2HwyYAs2DOJptrKcHd0kT7I5Z4FI7TVSGpa2gHdcNd_1Bk3TzYFLPOny",
  product5:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBrpVzfZqA5W7DNl50MDESNVkx-Dt5vftNZHZU06wWYb6YfxmcIWuT2IBadsolIowInuQCO3XYuxu2goRJUjMRLz4FpuyZSco1wcXgXXWplZ-hP-lXQWC6hYY45NlafyUzYQKndvDF1Mwyxv13Ea-bJSQNy-Nl8v_aIrWfGrbgwfk9_2X20UEbhmQDwaccvAUfhy2zyk2jzv_PATXvj90B_micnWG0d39UOrwC0GP6OfKYDy5jMYAd6PHT7p_bJpmDu3qxiLfN8909C",
  deliveryBot:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCMEEoJwbj1fp-1Lo-PxSSypWZEHCEkdtgJ8eXmIVsKspjNtJXpnHV68l34zGE5XR5MdgvAmHvzZB4upLoU2g41umYoecTI3YLhhbzl5uyfps42OH-6EGoCfMmtZlTjdWGP7lOf9CSKL1YjVOdHtgT01_hrfyFGP6vnpzGMyELM4bZP2cNPLh3gGbeP9SyBb_RJr3i-945nRcDHNSj9zvMPto7cyAhABu5VT0A_IHFC26FUHmaUi5vJcMPEPK_JpOtu3ik6q7AjvZxL",
};

// ─── Product Images for API products ──────
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

// ─── Data ──────────────────────────────────
const MARKETS = [
  {
    id: "hoc-mon",
    name: "Hóc Môn",
    subtitle: "Vựa Rau Lớn Nhất",
    trend: "-5% hôm nay",
    image: IMAGES.hocMon,
    type: "down",
  },
  {
    id: "binh-dien",
    name: "Bình Điền",
    subtitle: "Trung Tâm Hải Sản",
    trend: "+2% biến động",
    image: IMAGES.binhDien,
    type: "up",
  },
  {
    id: "thu-duc",
    name: "Thủ Đức",
    subtitle: "Đầu Mối Trái Cây",
    trend: "-3% giá tuần",
    image: IMAGES.thuDuc,
    type: "down",
  },
];

const CATEGORIES = [
  { id: "", name: "Tất cả", icon: "grid" },
  { id: "rau-cu", name: "Rau củ", icon: "leaf" },
  { id: "cu-qua", name: "Củ quả", icon: "nutrition" },
  { id: "trai-cay", name: "Trái cây", icon: "basket" },
  { id: "gia-vi", name: "Gia vị", icon: "flask" },
];

const PRODUCTS = [
  {
    id: "p1",
    name: "Cà chua VietGAP Hóc Môn",
    market: "Hóc Môn",
    category: "rau-cu",
    price: 25000,
    oldPrice: 28000,
    trend: "2% vs hqua",
    badge: "Bán chạy",
    badgeType: "secondary",
    trendType: "down",
    image: IMAGES.product1,
  },
  {
    id: "p2",
    name: "Khoai tây Đà Lạt Loại 1",
    market: "Đà Lạt",
    category: "cu-qua",
    price: 18500,
    trend: "5% vs hqua",
    badge: "Grade A",
    badgeType: "tertiary",
    trendType: "up",
    image: IMAGES.product2,
  },
  {
    id: "p3",
    name: "Hành tím Vĩnh Châu sạch",
    market: "Thủ Đức",
    category: "cu-qua",
    price: 32000,
    trend: "Ổn định",
    trendType: "flat",
    image: IMAGES.product3,
  },
  {
    id: "p4",
    name: "Bơ sáp Đắk Lắk Size L",
    market: "Đà Lạt",
    category: "trai-cay",
    price: 45000,
    trend: "-1% vs hqua",
    badge: "Sắp hết",
    badgeType: "error",
    trendType: "down",
    image: IMAGES.product4,
  },
  {
    id: "p5",
    name: "Tỏi Phan Rang sạch",
    market: "Bình Điền",
    category: "gia-vi",
    price: 0,
    outOfStock: true,
    badge: "Hết hàng",
    badgeType: "muted",
    image: IMAGES.product5,
  },
];

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

// ─── Cart Item Type ────────────────────────────
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface CartItem {
  id: string;
  name: string;
  market: string;
  unit: string;
  price: number;
  qty: number;
  image: string;
  note?: string;
}

// ─── Screen ────────────────────────────────
export function OrderListScreen({ route }: { route?: any }) {
  const { user, signOut } = useAuthStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OrdersNav>();
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    if (route?.params?.openCart) {
      setShowCart(true);
      navigation.setParams({ openCart: undefined } as any);
    }
  }, [route?.params?.openCart]);

  // ── Tab state ────────────────────────────
  const [activeTab, setActiveTab] = useState<'explore' | 'products'>('explore');

  // ── Product tab filter state ─────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');

  // ── Global cart state ───
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

  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();

  const addToCart = (product: typeof PRODUCTS[0]) => {
    globalAddToCart({
      id: product.id,
      name: product.name,
      market: product.market,
      unit: 'Kg',
      price: product.price,
      image: product.image,
    });
  };

  const isCartEmpty = cart.length === 0;

  const removeFromCart = (productName: string) => {
    const item = cart.find(c => c.name === productName);
    if (item) {
      globalRemoveFromCart(item.id);
    }
  };

  const getCartQty = (productName: string) => cart.find(c => c.name === productName)?.qty ?? 0;

  // ── Explore tab demo detail state ────────
  const [demoDetailProduct, setDemoDetailProduct] = useState<(typeof PRODUCTS)[0] | null>(null);

  // ── API state for products tab ────────────
  const [apiMarkets, setApiMarkets] = useState<MarketDto[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryDto[]>([]);
  const [apiProducts, setApiProducts] = useState<MarketProductDto[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiRefreshing, setApiRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Product detail state ──────────────────
  const [detailProduct, setDetailProduct] = useState<{ product: MarketProductDto; image: string; marketName: string } | null>(null);
  const [detailHistory, setDetailHistory] = useState<PriceHistoryItemDto[]>([]);
  const [detailHistoryLoading, setDetailHistoryLoading] = useState(false);
  const [detailHistoryError, setDetailHistoryError] = useState<string | null>(null);
  const [detailOrderQuantity, setDetailOrderQuantity] = useState(1);

  const apiLoadInit = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([
        pricingApi.getMarkets(),
        pricingApi.getCategories(),
      ]);
      setApiMarkets(m);
      setApiCategories(c);
      if (m.length > 0 && !selectedMarketId) {
        setSelectedMarketId(m[0].id);
      }
    } catch {
      setApiError('Không thể tải danh sách chợ');
    }
  }, []);

  const apiLoadProducts = useCallback(async (marketId: string, category?: string) => {
    try {
      setApiError(null);
      const result = await pricingApi.getMarketProducts(marketId, {
        category: category || undefined,
        pageSize: 100,
      });
      setApiProducts(result.items);
    } catch {
      setApiError('Không thể tải sản phẩm');
    }
  }, []);

  // ── Init on mount ─────────────────────────
  useEffect(() => {
    setApiLoading(true);
    apiLoadInit().finally(() => setApiLoading(false));
  }, []);

  // ── Re-fetch when market/category changes ──
  useEffect(() => {
    if (!selectedMarketId) return;
    setApiLoading(true);
    apiLoadProducts(selectedMarketId, activeCategory).finally(() => setApiLoading(false));
  }, [selectedMarketId, activeCategory]);

  // ── Pull-to-refresh ───────────────────────
  const handleApiRefresh = useCallback(async () => {
    setApiRefreshing(true);
    await Promise.all([
      apiLoadInit(),
      selectedMarketId && apiLoadProducts(selectedMarketId, activeCategory),
    ]);
    setApiRefreshing(false);
  }, [selectedMarketId, activeCategory]);

  // ── Filter API products by search ─────────
  const filteredApiProducts = useMemo(() => {
    if (!searchQuery) return apiProducts;
    return apiProducts.filter(p =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, apiProducts]);

  // ── Add API product to cart ───────────────
  const addApiToCart = (product: MarketProductDto, quantity = 1) => {
    if (quantity <= 0) return;

    const marketName = apiMarkets.find(m => m.id === product.marketId)?.name ?? '';
    const existing = cart.find(c => c.id === product.marketProductId);

    if (existing) {
      const newQty = Math.min(product.availableQuantity, existing.qty + quantity);
      updateItemQty(product.marketProductId, newQty);
    } else {
      globalAddToCart({
        id: product.marketProductId,
        name: product.productName,
        market: marketName,
        unit: product.unit,
        price: product.currentPrice,
        image: productImage(apiProducts.indexOf(product)),
      });
      if (quantity > 1) {
        updateItemQty(product.marketProductId, Math.min(product.availableQuantity, quantity));
      }
    }
  };

  const getApiCartQty = (productId: string) => cart.find(c => c.id === productId)?.qty ?? 0;

  const openApiProductDetail = useCallback(async (product: MarketProductDto, index: number) => {
    const marketName = apiMarkets.find(m => m.id === product.marketId)?.name ?? '';
    setDetailProduct({ product, image: productImage(index), marketName });
    setDetailOrderQuantity(product.availableQuantity > 0 ? 1 : 0);
    setDetailHistory([]);
    setDetailHistoryError(null);
    setDetailHistoryLoading(true);

    try {
      const history = await pricingApi.getPriceHistory(product.marketId, product.productId, {
        pageSize: 5,
      });
      setDetailHistory(history.items);
    } catch {
      setDetailHistoryError('Khong the tai lich su gia');
    } finally {
      setDetailHistoryLoading(false);
    }
  }, [apiMarkets]);

  const handleQuantityInputChange = (text: string) => {
    if (!detailProduct) return;
    const parsed = parseInt(text.replace(/\D/g, ''), 10);
    const maxQty = Math.max(0, detailProduct.product.availableQuantity);
    if (Number.isNaN(parsed)) {
      setDetailOrderQuantity(0);
    } else {
      setDetailOrderQuantity(Math.min(maxQty, parsed));
    }
  };

  const closeProductDetail = useCallback(() => {
    setDetailProduct(null);
    setDetailOrderQuantity(1);
    setDetailHistory([]);
    setDetailHistoryError(null);
    setDetailHistoryLoading(false);
  }, []);

  // ── Filtered products for catalog tab ────
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeCategory && p.category !== activeCategory) return false;
      if (selectedMarketId) {
        const market = MARKETS.find(m => m.id === selectedMarketId);
        if (market && p.market !== market.name) return false;
      }
      return true;
    });
  }, [searchQuery, activeCategory, selectedMarketId]);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi FreshFlow?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: signOut },
    ]);
  };

  const renderProduct = ({ item }: { item: (typeof PRODUCTS)[0] }) => (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        item.outOfStock && styles.productCardDisabled,
        pressed && { opacity: 0.9 },
      ]}
      onPress={() => setDemoDetailProduct(item)}
    >
      {/* Image Area */}
      <View style={styles.productImageArea}>
        <Image source={{ uri: item.image }} style={styles.productImg} />
        {item.badge && (
          <View
            style={[
              styles.pBadge,
              item.badgeType === "secondary" && styles.pBadgeSecondary,
              item.badgeType === "tertiary" && styles.pBadgeTertiary,
              item.badgeType === "error" && styles.pBadgeError,
              item.badgeType === "muted" && styles.pBadgeMuted,
            ]}
          >
            <Text style={styles.pBadgeText}>{item.badge}</Text>
          </View>
        )}
        <Pressable 
          style={styles.heartBtn}
          onPress={() => toggleFavorite({
            id: item.id,
            productId: item.id,
            name: item.name,
            marketId: 'demo',
            marketName: item.market,
            category: item.category || 'Khác',
            price: item.price,
            unit: 'Kg',
            image: item.image,
            availableQuantity: 10,
            currentQuantity: 10,
          })}
        >
          <Ionicons
            name={isFavorite(item.id) ? "heart" : "heart-outline"}
            size={16}
            color={isFavorite(item.id) ? Colors.error : Colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      {/* Info Area */}
      <View style={styles.productInfo}>
        <Text style={styles.productMarketText}>{item.market}</Text>
        <Text style={styles.productNameText} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.trendRow}>
          {item.trendType === "down" && (
            <MaterialIcons
              name="arrow-downward"
              size={14}
              color={Colors.primary}
            />
          )}
          {item.trendType === "up" && (
            <MaterialIcons name="arrow-upward" size={14} color={Colors.error} />
          )}
          {item.trendType === "flat" && (
            <MaterialIcons
              name="horizontal-rule"
              size={14}
              color={Colors.onSurfaceVariant}
            />
          )}
          <Text
            style={[
              styles.trendLabel,
              item.trendType === "down" && styles.trendDownColor,
              item.trendType === "up" && styles.trendUpColor,
              item.trendType === "flat" && styles.trendFlatColor,
            ]}
          >
            {item.trend || "Ổn định"}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardPrice}>
              {item.outOfStock ? "--" : formatPrice(item.price)}
            </Text>
            {!item.outOfStock && <Text style={styles.cardUnit}>/kg</Text>}
          </View>
          <Pressable
            style={[
              styles.addToCartBtn,
              item.outOfStock && styles.addToCartDisabled,
            ]}
            disabled={item.outOfStock}
            onPress={() => addToCart(item)}
          >
            <MaterialIcons
              name={item.outOfStock ? "block" : "add-shopping-cart"}
              size={18}
              color={item.outOfStock ? Colors.onSurfaceVariant : "#FFF"}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  const renderProductInCatalog = ({ item, index }: { item: MarketProductDto; index: number }) => {
    const qty = getApiCartQty(item.marketProductId);
    const outOfStock = item.availableQuantity <= 0;
    const marketName = apiMarkets.find(m => m.id === item.marketId)?.name ?? '';
    return (
      <Pressable
        style={({ pressed }) => [
          styles.catalogListCard,
          pressed && styles.catalogListCardPressed,
          outOfStock && styles.productCardDisabled,
        ]}
        onPress={() => openApiProductDetail(item, index)}
      >
        <View style={styles.catalogListHeader}>
          <Image source={{ uri: productImage(index) }} style={styles.catalogListImage} />
          <View style={styles.catalogListInfo}>
            <Text style={styles.catalogMarketText}>{marketName}</Text>
            <Text style={styles.catalogListName} numberOfLines={2}>{item.productName}</Text>
            <View style={styles.catalogTagsRow}>
              {!!item.category && (
                <View style={styles.catalogCategoryTag}>
                  <Text style={styles.catalogCategoryText}>{item.category}</Text>
                </View>
              )}
              <View style={styles.catalogUnitTag}>
                <Text style={styles.catalogUnitText}>{item.unit}</Text>
              </View>
            </View>
          </View>
          <View style={styles.catalogHeaderRight}>
            <Pressable 
              style={styles.catalogHeartBtn}
              onPress={() => toggleFavorite({
                id: item.marketProductId,
                productId: item.productId,
                name: item.productName,
                marketId: item.marketId,
                marketName: marketName,
                category: item.category || 'Khác',
                price: item.currentPrice,
                unit: item.unit,
                image: productImage(index),
                availableQuantity: item.availableQuantity,
                currentQuantity: item.currentQuantity,
              })}
            >
              <Ionicons 
                name={isFavorite(item.marketProductId) ? "heart" : "heart-outline"} 
                size={22} 
                color={isFavorite(item.marketProductId) ? Colors.error : Colors.outline} 
              />
            </Pressable>
            {outOfStock ? (
              <View style={styles.catalogOutBadge}>
                <Text style={styles.catalogOutText}>HẾT HÀNG</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.catalogListFooter}>
          <View>
            <Text style={styles.catalogPriceLabel}>Giá hiện tại</Text>
            <Text style={[styles.catalogListPrice, outOfStock && styles.priceOutOfStock]}>
              {outOfStock ? '—' : formatPrice(item.currentPrice)}
            </Text>
          </View>

          <View style={styles.catalogStockSection}>
            <Ionicons
              name={outOfStock ? 'alert-circle' : 'cube-outline'}
              size={16}
              color={outOfStock ? Colors.danger : Colors.textMuted}
            />
            <Text style={[styles.catalogStockText, outOfStock && styles.catalogStockTextDanger]}>
              Kho: {item.availableQuantity} {item.unit}
            </Text>
          </View>

          {!outOfStock && (
            <View style={styles.catalogQtyRow}>
              {qty > 0 ? (
                <>
                  <Pressable style={styles.catalogQtyBtn} onPress={() => {
                    globalRemoveFromCart(item.marketProductId);
                  }}>
                    <Ionicons name="remove" size={16} color="#FFF" />
                  </Pressable>
                  <Text style={styles.catalogQtyText}>{qty}</Text>
                  <Pressable style={styles.catalogQtyBtn} onPress={() => addApiToCart(item)}>
                    <Ionicons name="add" size={16} color="#FFF" />
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.catalogAddBtn} onPress={() => addApiToCart(item)}>
                  <Ionicons name="add" size={18} color="#FFF" />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ─── FIXED HEADER ──────────────────── */}
      <View style={styles.appHeader}>
        <View style={styles.headerTop}>
          <View style={styles.headerLogo}>
            <MaterialIcons
              name="agriculture"
              size={28}
              color={Colors.primary}
            />
            <Text style={styles.headerLogoText}>FreshFlow</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.hIconButton} onPress={() => navigation.navigate('ManageRecurringOrders')}>
              <Ionicons
                name="repeat-outline"
                size={23}
                color={Colors.onSurfaceVariant}
              />
            </Pressable>
            <Pressable style={styles.hIconButton} onPress={() => navigation.navigate('OrderHistory')}>
              <Ionicons
                name="time-outline"
                size={23}
                color={Colors.onSurfaceVariant}
              />
            </Pressable>
            <Pressable style={styles.hIconButton}>
              <MaterialIcons
                name="notifications"
                size={24}
                color={Colors.onSurfaceVariant}
              />
              <View style={styles.hBadgeDot} />
            </Pressable>
            <Pressable onPress={handleLogout}>
              <Image source={{ uri: IMAGES.avatar }} style={styles.hAvatar} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── SEGMENTED TAB BAR ──────────────── */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, activeTab === 'explore' && styles.tabItemActive]}
          onPress={() => setActiveTab('explore')}
        >
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Khám phá</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Sản phẩm</Text>
        </Pressable>
      </View>

      {activeTab === 'explore' ? (
        <FlatList
          data={PRODUCTS}
          renderItem={renderProduct}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* ─── HERO ALERT ────────────────────── */}
              <View style={styles.heroBox}>
                <Image source={{ uri: IMAGES.hero }} style={styles.heroImg} />
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <View style={styles.heroAlertTag}>
                    <Text style={styles.heroAlertTagText}>Cảnh báo giá giảm</Text>
                  </View>
                  <Text style={styles.heroTitle}>
                    Ưu đãi đặt hàng sớm - Giảm 15% tất cả mặt hàng Rau Củ
                  </Text>
                  <Text style={styles.heroSub}>
                    Đặt hàng trước 22:00 hôm nay để nhận ưu đãi tốt nhất từ Chợ
                    Đầu Mối Hóc Môn.
                  </Text>
                  <Pressable style={styles.heroButton}>
                    <Text style={styles.heroButtonText}>Đặt hàng ngay</Text>
                  </Pressable>
                </View>
              </View>

              {/* ─── BENTO MARKETS ─────────────────── */}
              <View style={styles.secTitleRow}>
                <Text style={styles.secTitle}>Thị trường Đầu Mối</Text>
                <Text style={styles.secAction}>Xem bản đồ giá</Text>
              </View>
              <View style={styles.marketBento}>
                {MARKETS.map((m, i) => (
                  <View
                    key={m.id}
                    style={[styles.marketCard, i === 0 && styles.marketCardWide]}
                  >
                    <Image source={{ uri: m.image }} style={styles.marketImg} />
                    <View style={styles.marketMask} />
                    <View style={styles.marketContent}>
                      <Text style={styles.marketSubText}>{m.subtitle}</Text>
                      <Text style={styles.marketTitleText}>{m.name}</Text>
                      <View style={styles.marketTrendRow}>
                        <MaterialIcons
                          name={
                            m.type === "down" ? "trending-down" : "trending-up"
                          }
                          size={16}
                          color={m.type === "down" ? "#4ADE80" : "#FBBF24"}
                        />
                        <Text
                          style={[
                            styles.marketTrendTxt,
                            { color: m.type === "down" ? "#4ADE80" : "#FBBF24" },
                          ]}
                        >
                          {m.trend}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* ─── PRODUCT LIST HEADER ────────────── */}
              <View style={styles.secTitleRow}>
                <Text style={styles.secTitle}>Hàng Sáng Nay</Text>
                <Text style={styles.secCount}>24 Items</Text>
              </View>
            </>
          }
          ListFooterComponent={
            <>
              {/* ─── STATS SECTION ─────────────────── */}
              <View style={styles.statsLayout}>
                {[
                  {
                    icon: "verified" as const,
                    v: "100%",
                    l: "Kiểm duyệt nguồn gốc",
                  },
                  {
                    icon: "support-agent" as const,
                    v: "24/7",
                    l: "Hỗ trợ thu mua",
                  },
                  {
                    icon: "payments" as const,
                    v: "Tiết kiệm",
                    l: "Chiết khấu tới 15%",
                  },
                  {
                    icon: "speed" as const,
                    v: "Thần tốc",
                    l: "Giao hàng hỏa tốc",
                  },
                ].map((s, i) => (
                  <View key={i} style={styles.statCell}>
                    <MaterialIcons
                      name={s.icon as any}
                      size={32}
                      color={Colors.primary}
                    />
                    <Text style={styles.statVal}>{s.v}</Text>
                    <Text style={styles.statLbl}>{s.l}</Text>
                  </View>
                ))}
              </View>

              {/* ─── FOOTER ──────────────────────────── */}
              <View style={styles.footerSection}>
                {/* Brand & Desc */}
                <View style={styles.footerBrand}>
                  <MaterialIcons name="agriculture" size={28} color={Colors.primary} />
                  <Text style={styles.footerBrandText}>FreshFlow</Text>
                </View>
                <Text style={styles.footerDesc}>
                  Nền tảng thu mua thực phẩm B2B thông minh. Kết nối nhà hàng với các chợ đầu mối lớn nhất TP.HCM.
                </Text>

                {/* Contact info */}
                <View style={styles.footerInfoSection}>
                  <View style={styles.footerInfoRow}>
                    <MaterialIcons name="phone" size={16} color={Colors.primary} />
                    <Text style={styles.footerInfoText}>1900 1234 56</Text>
                  </View>
                  <View style={styles.footerInfoRow}>
                    <MaterialIcons name="email" size={16} color={Colors.primary} />
                    <Text style={styles.footerInfoText}>info@freshflow.vn</Text>
                  </View>
                  <View style={styles.footerInfoRow}>
                    <MaterialIcons name="location-on" size={16} color={Colors.primary} />
                    <Text style={styles.footerInfoText}>123 Nguyễn Huệ, Quận 1, TP.HCM</Text>
                  </View>
                  <View style={styles.footerInfoRow}>
                    <MaterialIcons name="schedule" size={16} color={Colors.primary} />
                    <Text style={styles.footerInfoText}>06:00 - 20:00 • T2 - CN</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.footerDivider} />

                {/* Social + Copy */}
                <View style={styles.footerSocialRow}>
                  <Ionicons name="logo-facebook" size={22} color={Colors.outline} />
                  <Ionicons name="globe-outline" size={22} color={Colors.outline} />
                  <Ionicons name="call-outline" size={22} color={Colors.outline} />
                </View>
                <Text style={styles.footerCopyText}>© 2024 FreshFlow Supply Chain Dynamics.</Text>
              </View>
            </>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {apiLoading && apiProducts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
            </View>
          ) : apiError && apiProducts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="error-outline" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{apiError}</Text>
              <Pressable style={styles.retryBtn} onPress={() => {
                setApiLoading(true);
                if (selectedMarketId) {
                  apiLoadProducts(selectedMarketId, activeCategory).finally(() => setApiLoading(false));
                } else {
                  apiLoadInit().finally(() => setApiLoading(false));
                }
              }}>
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filteredApiProducts}
              renderItem={(props) => renderProductInCatalog({ ...props, index: props.index })}
              keyExtractor={(p) => p.marketProductId}
              numColumns={1}
              contentContainerStyle={styles.mainScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={apiRefreshing} onRefresh={handleApiRefresh} colors={[Colors.primary]} />
              }
              ListHeaderComponent={
                <View>
                  {/* Search Bar */}
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.outline} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm sản phẩm..."
                      placeholderTextColor={Colors.outline}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={Colors.outline} />
                      </Pressable>
                    )}
                  </View>

                  {/* Market Chips */}
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={apiMarkets}
                    keyExtractor={(m) => m.id}
                    contentContainerStyle={styles.chipRow}
                    renderItem={({ item }) => {
                      const active = selectedMarketId === item.id;
                      return (
                        <Pressable
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setSelectedMarketId(item.id === selectedMarketId ? null : item.id)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
                        </Pressable>
                      );
                    }}
                  />

                  {/* Category Chips */}
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={apiCategories}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.chipRow}
                    renderItem={({ item }) => {
                      const active = activeCategory === item.name;
                      return (
                        <Pressable
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setActiveCategory(item.name === activeCategory ? '' : item.name)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              }
              ListEmptyComponent={
                !apiLoading ? (
                  <View style={styles.emptyCatalog}>
                    <Ionicons name="search-outline" size={48} color={Colors.outline} />
                    <Text style={styles.emptyCatalogText}>Không tìm thấy sản phẩm</Text>
                    <Text style={styles.emptyCatalogSub}>Thử thay đổi bộ lọc hoặc từ khoá</Text>
                    <Pressable
                      style={styles.clearFiltersBtn}
                      onPress={() => {
                        setSearchQuery('');
                        setActiveCategory('');
                        if (apiMarkets.length > 0) {
                          setSelectedMarketId(apiMarkets[0].id);
                        } else {
                          setSelectedMarketId(null);
                        }
                      }}
                    >
                      <Text style={styles.clearFiltersBtnText}>Xoá bộ lọc</Text>
                    </Pressable>
                  </View>
                ) : null
              }
            />
          )}
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

      {/* ─── DEMO PRODUCT DETAIL MODAL (Explore tab) ─── */}
      <Modal
        visible={demoDetailProduct !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setDemoDetailProduct(null)}
      >
        <View style={styles.productDetailOverlay}>
          <Pressable style={styles.productDetailBackdrop} onPress={() => setDemoDetailProduct(null)} />
          <View style={styles.productDetailSheet}>
            <View style={styles.productDetailHandle} />
            {demoDetailProduct && (
              <ScrollView contentContainerStyle={styles.productDetailContent} showsVerticalScrollIndicator={false}>
                <View style={styles.productDetailImageWrap}>
                  <Image source={{ uri: demoDetailProduct.image }} style={styles.productDetailImage} />
                  <Pressable style={styles.productDetailClose} onPress={() => setDemoDetailProduct(null)}>
                    <Ionicons name="close" size={22} color={Colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={styles.productDetailTitleRow}>
                  <Text style={styles.productDetailMarketText}>{demoDetailProduct.market}</Text>
                  {demoDetailProduct.badge && (
                    <View style={[styles.pBadge, demoDetailProduct.badgeType === 'secondary' && styles.pBadgeSecondary, demoDetailProduct.badgeType === 'error' && styles.pBadgeError, demoDetailProduct.badgeType === 'muted' && styles.pBadgeMuted]}>
                      <Text style={styles.pBadgeText}>{demoDetailProduct.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.productDetailName}>{demoDetailProduct.name}</Text>

                <View style={styles.productDetailPriceCard}>
                  <Text style={styles.productDetailPriceLabel}>Giá hiện tại</Text>
                  <Text style={styles.productDetailPrice}>{demoDetailProduct.outOfStock ? '—' : formatPrice(demoDetailProduct.price)}</Text>
                  {!demoDetailProduct.outOfStock && <Text style={styles.productDetailUnit}>/kg</Text>}
                </View>

                <View style={styles.productDetailInfoCard}>
                  <View style={styles.productDetailInfoRow}>
                    <Text style={styles.productDetailInfoLabel}>Xu hướng</Text>
                    <Text style={styles.productDetailInfoValue}>{demoDetailProduct.trend || 'Ổn định'}</Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.productDetailAddBtn, demoDetailProduct.outOfStock && styles.productDetailAddBtnDisabled]}
                  disabled={demoDetailProduct.outOfStock}
                  onPress={() => {
                    addToCart(demoDetailProduct);
                    setDemoDetailProduct(null);
                  }}
                >
                  <Ionicons name="cart" size={18} color="#FFF" />
                  <Text style={styles.productDetailAddText}>
                    {demoDetailProduct.outOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── API PRODUCT DETAIL MODAL (Products tab) ─── */}
      <Modal
        visible={detailProduct !== null}
        animationType="slide"
        transparent
        onRequestClose={closeProductDetail}
      >
        <View style={styles.productDetailOverlay}>
          <Pressable style={styles.productDetailBackdrop} onPress={closeProductDetail} />
          <View style={styles.productDetailSheet}>
            <View style={styles.productDetailHandle} />
            {detailProduct && (
              <ScrollView contentContainerStyle={styles.productDetailContent} showsVerticalScrollIndicator={false}>
                <View style={styles.productDetailImageWrap}>
                  <Image source={{ uri: detailProduct.image }} style={styles.productDetailImage} />
                  <Pressable style={styles.productDetailClose} onPress={closeProductDetail}>
                    <Ionicons name="close" size={22} color={Colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={styles.productDetailTitleRow}>
                  <View style={styles.productDetailCategoryTag}>
                    <Text style={styles.productDetailCategoryText}>{detailProduct.product.category || 'Khác'}</Text>
                  </View>
                  <Text style={styles.productDetailMarketText}>{detailProduct.marketName}</Text>
                </View>

                <Text style={styles.productDetailName}>{detailProduct.product.productName}</Text>

                <View style={styles.productDetailPriceCard}>
                  <Text style={styles.productDetailPriceLabel}>Giá hiện tại</Text>
                  <Text style={styles.productDetailPrice}>{formatPrice(detailProduct.product.currentPrice)}</Text>
                  <Text style={styles.productDetailUnit}>/{detailProduct.product.unit}</Text>
                </View>

                <View style={styles.productDetailStatsGrid}>
                  <View style={styles.productDetailStatCard}>
                    <Text style={styles.productDetailStatLabel}>Số lượng tại chợ</Text>
                    <Text style={styles.productDetailStatValue}>{detailProduct.product.currentQuantity}</Text>
                  </View>
                  <View style={styles.productDetailStatCard}>
                    <Text style={styles.productDetailStatLabel}>Có thể đặt</Text>
                    <Text style={styles.productDetailStatValue}>{Math.max(0, detailProduct.product.availableQuantity)}</Text>
                  </View>
                </View>

                <View style={styles.productDetailInfoCard}>
                  <View style={styles.productDetailInfoRow}>
                    <Text style={styles.productDetailInfoLabel}>Mã sản phẩm</Text>
                    <Text style={styles.productDetailInfoValue} numberOfLines={1}>{detailProduct.product.productId}</Text>
                  </View>
                </View>

                <View style={styles.productDetailInfoCard}>
                  <View style={styles.productPurchaseHeader}>
                    <View style={styles.productPurchaseHeaderText}>
                      <Text style={styles.productPurchaseTitle}>Chọn số lượng mua</Text>
                      <Text style={styles.productPurchaseSub}>
                        Mua theo số nguyên: 1, 2, 3 {detailProduct.product.unit}
                      </Text>
                    </View>
                    <Text style={styles.productPurchaseAvailable}>
                      Còn {Math.max(0, detailProduct.product.availableQuantity)}
                    </Text>
                  </View>

                  <View style={styles.productQuantityPicker}>
                    <Pressable
                      style={[
                        styles.productQuantityBtn,
                        detailOrderQuantity <= 1 && styles.productQuantityBtnDisabled,
                      ]}
                      disabled={detailOrderQuantity <= 1}
                      onPress={() => setDetailOrderQuantity((qty) => Math.max(1, qty - 1))}
                    >
                      <MaterialIcons
                        name="remove"
                        size={18}
                        color={detailOrderQuantity <= 1 ? Colors.outline : Colors.primary}
                      />
                    </Pressable>

                    <View style={styles.productQuantityValueWrap}>
                      <TextInput
                        style={styles.productQuantityInput}
                        value={String(detailOrderQuantity || '')}
                        onChangeText={handleQuantityInputChange}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                      <Text style={styles.productQuantityUnit}>{detailProduct.product.unit}</Text>
                    </View>

                    <Pressable
                      style={[
                        styles.productQuantityBtn,
                        detailOrderQuantity >= Math.max(0, detailProduct.product.availableQuantity) &&
                          styles.productQuantityBtnDisabled,
                      ]}
                      disabled={detailOrderQuantity >= Math.max(0, detailProduct.product.availableQuantity)}
                      onPress={() =>
                        setDetailOrderQuantity((qty) =>
                          Math.min(Math.max(0, detailProduct.product.availableQuantity), qty + 1),
                        )
                      }
                    >
                      <MaterialIcons
                        name="add"
                        size={18}
                        color={
                          detailOrderQuantity >= Math.max(0, detailProduct.product.availableQuantity)
                            ? Colors.outline
                            : Colors.primary
                        }
                      />
                    </Pressable>
                  </View>

                  <View style={styles.productPurchaseTotalRow}>
                    <Text style={styles.productPurchaseTotalLabel}>Tạm tính</Text>
                    <Text style={styles.productPurchaseTotalValue}>
                      {formatPrice(detailProduct.product.currentPrice * detailOrderQuantity)}
                    </Text>
                  </View>
                </View>

                <View style={styles.productDetailInfoCard}>
                  <View style={styles.productHistoryHeader}>
                    <Text style={styles.productHistoryTitle}>Lịch sử cập nhật giá</Text>
                    <Text style={styles.productHistorySub}>5 lần gần nhất</Text>
                  </View>

                  {detailHistoryLoading ? (
                    <View style={styles.productHistoryLoading}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.productHistoryLoadingText}>Đang tải lịch sử...</Text>
                    </View>
                  ) : detailHistoryError ? (
                    <Text style={styles.productHistoryError}>{detailHistoryError}</Text>
                  ) : detailHistory.length === 0 ? (
                    <Text style={styles.productHistoryEmpty}>Chưa có lịch sử cập nhật giá</Text>
                  ) : (
                    detailHistory.map((history) => (
                      <View key={history.id} style={styles.productHistoryRow}>
                        <View style={styles.productHistoryLeft}>
                          <Text style={styles.productHistoryPrice}>{formatPrice(history.price)}</Text>
                          <Text style={styles.productHistoryDate}>{formatDateTime(history.recordedAt)}</Text>
                        </View>
                        <View style={styles.productHistoryQtyBadge}>
                          <Text style={styles.productHistoryQty}>{history.quantity}</Text>
                          <Text style={styles.productHistoryQtyLabel}>SL</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <Pressable
                  style={[
                    styles.productDetailAddBtn,
                    detailOrderQuantity <= 0 && styles.productDetailAddBtnDisabled,
                  ]}
                  disabled={detailOrderQuantity <= 0}
                  onPress={() => {
                    addApiToCart(detailProduct.product, detailOrderQuantity);
                    closeProductDetail();
                  }}
                >
                  <Ionicons name="cart" size={18} color="#FFF" />
                  <Text style={styles.productDetailAddText}>
                    {detailOrderQuantity <= 0
                      ? 'Tạm hết hàng'
                      : `Thêm ${detailOrderQuantity} ${detailProduct.product.unit} vào giỏ`}
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
                      {(item.price * item.qty).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={styles.cartScreenItemQty}>
                    <Pressable style={styles.cartScreenQtyBtn} onPress={() => removeFromCart(item.name)}>
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
                  <Text style={styles.cartScreenSummaryValue}>{cartTotal.toLocaleString('vi-VN')}đ</Text>
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
                  <Text style={styles.cartScreenSummaryTotalValue}>{(cartTotal).toLocaleString('vi-VN')}đ</Text>
                </View>
              </View>
            }
          />

          {/* Footer Bar */}
          <View style={styles.cartScreenCheckoutBar}>
            <View>
              <Text style={styles.cartScreenCheckoutLabel}>Tạm tính</Text>
              <Text style={styles.cartScreenCheckoutTotal}>{(cartTotal).toLocaleString('vi-VN')}đ</Text>
            </View>
            <Pressable
              style={[
                styles.cartScreenCheckoutBtn,
                isCartEmpty && styles.cartScreenCheckoutBtnDisabled,
              ]}
              disabled={isCartEmpty}
              onPress={() => {
                if (isCartEmpty) return;
                setShowCart(false);
                navigation.navigate('CreateOrder', {
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
                });
              }}
            >
              <Text style={styles.cartScreenCheckoutBtnText}>
                {isCartEmpty ? 'Thêm sản phẩm trước' : 'Tiến hành thanh toán'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default OrderListScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  mainScroll: { paddingBottom: 72 },

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

  // ─── Header ────────────────────────────────
  appHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLogo: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogoText: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 16 },
  hIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  hBadgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  hAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },

  // ─── Hero ──────────────────────────────────
  heroBox: {
    marginHorizontal: CONTAINER_PADDING,
    minHeight: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.secondaryContainer,
  },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,107,44,0.7)",
  },
  heroContent: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: CONTAINER_PADDING,
    justifyContent: "center",
  },
  heroAlertTag: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  heroAlertTagText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: "#FFF",
    lineHeight: 20,
  },
  heroSub: {
    fontSize: 11,
    fontFamily: "Inter-Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    lineHeight: 15,
  },
  heroButton: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  heroButtonText: { color: "#FFF", fontFamily: "Inter-Bold", fontSize: 12 },

  // ─── Market ────────────────────────────────
  secTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: CONTAINER_PADDING,
    marginTop: 12,
    marginBottom: 8,
  },
  secTitle: { fontSize: 18, fontFamily: "Inter-Bold", color: Colors.onSurface },
  secAction: {
    color: Colors.primary,
    fontFamily: "Inter-SemiBold",
    fontSize: 12,
  },
  secCount: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: "Inter-Medium",
  },
  marketBento: {
    paddingHorizontal: CONTAINER_PADDING,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  marketCard: {
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    width: (SCREEN_WIDTH - CONTAINER_PADDING * 2 - 10) / 2,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  marketCardWide: { width: SCREEN_WIDTH - CONTAINER_PADDING * 2 },
  marketImg: { ...StyleSheet.absoluteFillObject },
  marketMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  marketContent: { flex: 1, padding: 12, justifyContent: "flex-end" },
  marketSubText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontFamily: "Inter-Medium",
    textTransform: "uppercase",
  },
  marketTitleText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter-Bold",
    marginTop: 2,
  },
  marketTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  marketTrendTxt: { fontSize: 12, fontFamily: "Inter-Bold" },

  // ─── Product Card ──────────────────────────
  productRow: {
    paddingHorizontal: CONTAINER_PADDING,
    gap: 10,
    marginBottom: 10,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: "hidden",
  },
  productCardDisabled: { opacity: 0.6 },
  productImageArea: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: "hidden",
  },
  productImg: { width: "100%", height: "100%", resizeMode: "cover" },
  productInfo: { padding: 10, flexGrow: 1 },
  productMarketText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.outline,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productNameText: {
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
    marginTop: 2,
    height: 32,
    lineHeight: 15,
  },
  productUnit: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    color: Colors.outline,
    marginTop: 1,
  },
  cardName: {
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
    lineHeight: 16,
    marginBottom: 2,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 6,
    marginTop: 2,
  },
  trendLabel: { fontSize: 10, fontFamily: "Inter-Bold", color: Colors.primary },
  trendDownColor: { color: "#16A34A" },
  trendUpColor: { color: Colors.error },
  trendFlatColor: { color: Colors.onSurfaceVariant },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cardUnit: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    color: Colors.onSurfaceVariant,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { backgroundColor: Colors.surfaceVariant, elevation: 0 },
  pBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pBadgePrimary: { backgroundColor: Colors.primary },
  pBadgeSecondary: { backgroundColor: Colors.secondaryContainer },
  pBadgeTertiary: { backgroundColor: Colors.tertiaryContainer },
  pBadgeError: { backgroundColor: Colors.error },
  pBadgeMuted: { backgroundColor: Colors.surfaceVariant },
  pBadgeText: { fontSize: 8, fontFamily: "Inter-Bold", color: "#FFF" },
  heartBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  addToCartBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addToCartDisabled: { backgroundColor: Colors.surfaceVariant },

  // ─── Promo ─────────────────────────────────
  promoBox: {
    margin: CONTAINER_PADDING,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 32,
    flexDirection: "row",
    overflow: "hidden",
  },
  promoText: { flex: 1, zIndex: 10 },
  promoTitle: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Inter-Bold",
    lineHeight: 32,
  },
  promoSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontFamily: "Inter-Regular",
    marginTop: 12,
    lineHeight: 24,
  },
  promoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 24,
  },
  promoActionBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  promoActionText: {
    color: Colors.primary,
    fontFamily: "Inter-Bold",
    fontSize: 15,
  },
  promoTime: { flexDirection: "row", alignItems: "center", gap: 8 },
  promoTimeText: { color: "#FFF", fontFamily: "Inter-SemiBold", fontSize: 14 },
  promoImgArea: {
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  promoBgIcon: { opacity: 0.2, position: "absolute" },
  promoImg: { width: 140, height: 140, resizeMode: "contain" },

  // ─── Stats ─────────────────────────────────
  statsLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  statCell: { width: "50%", alignItems: "center", paddingVertical: 8 },
  statVal: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
    marginTop: 4,
  },
  statLbl: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    color: Colors.outline,
    textAlign: "center",
    marginTop: 2,
  },

  // ─── Footer ────────────────────────────────
  footerSection: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceContainerLow,
  },
  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  footerBrandText: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: Colors.primary,
  },
  footerDesc: {
    fontSize: 11,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
    lineHeight: 14,
    marginBottom: 6,
  },
  footerInfoSection: {
    gap: 2,
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerInfoText: {
    fontSize: 11,
    fontFamily: "Inter-Regular",
    color: Colors.onSurfaceVariant,
  },
  footerDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 6,
  },
  footerSocialRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginBottom: 4,
  },
  footerCopyText: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
  },

  // ─── Floating Cart FAB ────────────────────
  cartFab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cartFabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: Colors.background,
  },
  cartFabBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter-Bold",
  },

  // ─── Cart Full Screen ───────────────────
  cartScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cartScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  cartScreenClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cartScreenTitle: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cartScreenClear: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    color: Colors.error,
  },
  cartScreenList: {
    paddingBottom: 180,
  },
  cartScreenItem: {
    flexDirection: "column",
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
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
  },
  cartScreenItemMarket: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
  },
  cartScreenItemPrice: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
    marginTop: 4,
  },
  cartScreenItemQty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartScreenQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cartScreenQtyText: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
    minWidth: 24,
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartScreenVoucherInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: Colors.onSurface,
  },
  cartScreenVoucherBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartScreenVoucherBtnText: {
    color: "#FFF",
    fontFamily: "Inter-Bold",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartScreenSummaryLabel: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
  },
  cartScreenSummaryValue: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
  },
  cartScreenSummaryDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },
  cartScreenSummaryTotal: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cartScreenSummaryTotalValue: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: Colors.primary,
  },
  cartScreenCheckoutBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartScreenCheckoutLabel: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    color: Colors.outline,
  },
  cartScreenCheckoutTotal: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cartScreenCheckoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cartScreenCheckoutBtnDisabled: {
    backgroundColor: Colors.surfaceVariant,
  },
  cartScreenCheckoutBtnText: {
    color: "#FFF",
    fontFamily: "Inter-Bold",
    fontSize: 15,
  },
  // ─── End Cart Screen ─────────────────

  // ─── Tab Bar ──────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    marginHorizontal: CONTAINER_PADDING,
    marginVertical: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  // ─── Search Bar ─────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: CONTAINER_PADDING,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurface,
    height: 44,
  },

  // ─── Chip Row ───────────────────────────
  chipRow: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
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
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: Colors.onPrimary,
  },

  // ─── Catalog Qty Controls ──────────────
  catalogQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  catalogQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogQtyText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    minWidth: 20,
    textAlign: 'center',
  },
  catalogAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Catalog List Card (single-column) ──
  catalogListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: CONTAINER_PADDING,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catalogListCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  catalogListHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  catalogListImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  catalogListInfo: {
    flex: 1,
    gap: 4,
  },
  catalogMarketText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catalogListName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  catalogTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  catalogCategoryTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catalogCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  catalogUnitTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catalogUnitText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catalogOutBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  catalogOutText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.3,
  },
  catalogListFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 10,
  },
  catalogPriceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  catalogListPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 1,
  },
  priceOutOfStock: {
    color: Colors.textMuted,
  },
  catalogStockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  catalogStockText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  catalogStockTextDanger: {
    color: Colors.danger,
  },
  catalogInlineQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catalogInlineQtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  catalogInlineAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Product Detail Modal ───────────────
  productDetailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  productDetailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  productDetailSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 18,
  },
  productDetailHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 10,
  },
  productDetailContent: {
    padding: 20,
    paddingBottom: 24,
  },
  productDetailImageWrap: {
    marginBottom: 14,
  },
  productDetailImage: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  productDetailClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productDetailCategoryTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  productDetailCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  productDetailMarketText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  productDetailName: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  productDetailPriceCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  productDetailPriceLabel: {
    position: 'absolute',
    top: 10,
    left: 16,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  productDetailPrice: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
  },
  productDetailUnit: {
    marginBottom: 5,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  productDetailStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  productDetailStatCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  productDetailStatLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productDetailStatValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  productDetailInfoCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
  },
  productDetailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  productDetailInfoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productDetailInfoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  productPurchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  productPurchaseHeaderText: {
    flex: 1,
  },
  productPurchaseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  productPurchaseSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textMuted,
  },
  productPurchaseAvailable: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  productQuantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  productQuantityBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  productQuantityBtnDisabled: {
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  productQuantityValueWrap: {
    minWidth: 92,
    alignItems: 'center',
  },
  productQuantityValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  productQuantityInput: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    padding: 0,
    minWidth: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  productQuantityUnit: {
    marginTop: -2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  productPurchaseTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  productPurchaseTotalLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productPurchaseTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
  },
  productHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  productHistorySub: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  productHistoryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  productHistoryLoadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productHistoryError: {
    fontSize: 12,
    color: Colors.error,
  },
  productHistoryEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    gap: 12,
  },
  productHistoryLeft: {
    flex: 1,
  },
  productHistoryPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  productHistoryDate: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textMuted,
  },
  productHistoryQtyBadge: {
    minWidth: 48,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  productHistoryQty: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  productHistoryQtyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  productDetailAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
  },
  productDetailAddBtnDisabled: {
    backgroundColor: Colors.outline,
  },
  productDetailAddText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onPrimary,
  },

  // ─── Empty Catalog ─────────────────────
  emptyCatalog: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: CONTAINER_PADDING,
  },
  emptyCatalogText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },
  emptyCatalogSub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.outline,
    marginTop: 4,
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clearFiltersBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  catalogHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  catalogHeartBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
  },
});
