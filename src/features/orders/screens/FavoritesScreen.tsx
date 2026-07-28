import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { Text, TextInput } from '../../../components/ui/Text';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { useCartStore } from '../../../store/cartStore';
import { CartModal } from '../components/CartModal';

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

export function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { favorites, isLoading, toggleFavorite, refresh } = useFavoritesStore();
  const { cart, cartCount, addToCart } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const filteredFavorites = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('vi-VN');
    if (!q) return favorites;
    return favorites.filter(
      (item) =>
        item.productName.toLocaleLowerCase('vi-VN').includes(q) ||
        item.marketName.toLocaleLowerCase('vi-VN').includes(q) ||
        (item.category?.toLocaleLowerCase('vi-VN').includes(q) ?? false),
    );
  }, [favorites, searchQuery]);

  const stockByMarketProductId = useMemo(
    () => Object.fromEntries(favorites.map((item) => [item.marketProductId, item.availableQuantity])),
    [favorites],
  );

  const openProductDetail = (item: typeof favorites[0]) => {
    navigation.navigate('ProductDetail', {
      product: {
        marketProductId: item.marketProductId,
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl || null,
        marketId: item.marketId,
        marketName: item.marketName,
        category: item.category,
        unit: item.unit,
        currentPrice: item.currentPrice,
        availableQuantity: item.availableQuantity,
      },
    });
  };

  const getCartQty = (marketProductId: string) => {
    return cart.find((item) => item.id === marketProductId)?.qty ?? 0;
  };

  const handleAddToCart = (item: typeof favorites[0]) => {
    addToCart({
      id: item.marketProductId,
      name: item.productName,
      market: item.marketName,
      unit: item.unit,
      price: item.currentPrice,
      image: item.imageUrl ?? '',
    });
  };

  // Checkout is a multi-step flow (CreateOrder → ConfirmOrder) that only exists
  // in the Orders tab's stack, so this is the one action that still hands off
  // tabs — viewing/editing the cart itself stays local via `showCart` above.
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowCart(false);
    navigation.navigate('RestaurantOrders', {
      screen: 'CreateOrder',
      params: {
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
      },
    });
  };

  const renderFavoriteItem = ({ item }: { item: typeof favorites[0] }) => {
    const qty = getCartQty(item.marketProductId);
    const outOfStock = item.availableQuantity <= 0;

    return (
      <Pressable style={styles.card} onPress={() => openProductDetail(item)}>
        <View style={styles.cardHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="image-outline" size={22} color={Colors.outline} />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.marketText}>{item.marketName}</Text>
            <Text style={styles.nameText} numberOfLines={2}>{item.productName}</Text>
            <View style={styles.tagsRow}>
              {!!item.category && (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              )}
              <View style={styles.unitTag}>
                <Text style={styles.unitText}>{item.unit}</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={styles.heartBtn}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item);
            }}
          >
            <Ionicons name="heart" size={24} color={Colors.error} />
          </Pressable>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Giá hiện tại</Text>
            <Text style={[styles.priceText, outOfStock && styles.priceOutOfStock]}>
              {outOfStock ? '—' : formatPrice(item.currentPrice)}
            </Text>
          </View>

          <View style={styles.rightActions}>
            <View style={styles.stockSection}>
              <Ionicons
                name={outOfStock ? 'alert-circle' : 'cube-outline'}
                size={14}
                color={outOfStock ? Colors.danger : Colors.textMuted}
              />
              <Text style={[styles.stockText, outOfStock && styles.stockTextDanger]}>
                Kho: {item.availableQuantity} {item.unit}
              </Text>
            </View>

            {!outOfStock && (
              <Pressable
                style={styles.addBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddToCart(item);
                }}
              >
                <Ionicons name="add" size={18} color={Colors.onPrimary} />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Summary bar — becomes a search field when the search icon is tapped */}
      {favorites.length > 0 && (
        <View style={styles.topBar}>
          <View style={styles.summaryBar}>
            {isSearchActive ? (
              <>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    autoFocus
                    style={styles.searchInput}
                    placeholder="Tìm trong yêu thích..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} style={styles.searchClear}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={styles.cancelSearchBtn}
                  onPress={() => {
                    setIsSearchActive(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.cancelSearchText}>Huỷ</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.summaryLeft}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="heart" size={14} color={Colors.error} />
                  </View>
                  <Text style={styles.summaryText}>
                    {favorites.length} sản phẩm đã lưu
                  </Text>
                </View>
                <Pressable
                  style={styles.searchToggleBtn}
                  onPress={() => setIsSearchActive(true)}
                  accessibilityLabel="Tìm trong yêu thích"
                >
                  <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {isLoading && favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-dislike-outline" size={56} color={Colors.outline} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
          <Text style={styles.emptySub}>
            Hãy nhấn biểu tượng trái tim khi xem sản phẩm để lưu lại tại đây.
          </Text>
          <Pressable
            style={styles.shopBtn}
            onPress={() => navigation.navigate('RestaurantOrders')}
          >
            <Text style={styles.shopBtnText}>MUA SẮM NGAY</Text>
          </Pressable>
        </View>
      ) : filteredFavorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search-outline" size={48} color={Colors.outline} />
          </View>
          <Text style={styles.emptyTitle}>Không tìm thấy</Text>
          <Text style={styles.emptySub}>
            Không có sản phẩm yêu thích nào khớp với “{searchQuery}”.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={(item) => item.marketProductId}
          renderItem={renderFavoriteItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[Colors.primary]} />
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

      <CartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={handleCheckout}
        stockByMarketProductId={stockByMarketProductId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '15',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    padding: 4,
    marginLeft: 4,
  },
  cancelSearchBtn: {
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  cancelSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  marketText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  categoryTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryText,
  },
  unitTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  heartBtn: {
    padding: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryText,
    marginTop: 1,
  },
  priceOutOfStock: {
    color: Colors.textMuted,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  shopBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  shopBtnText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
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
});
