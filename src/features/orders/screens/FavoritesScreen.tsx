import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RestaurantColors as Colors } from '../../restaurant/theme';
import { RestaurantText as Text } from '../../restaurant/components/RestaurantText';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { useCartStore } from '../../../store/cartStore';

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

export function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const { cart, addToCart, removeFromCart } = useCartStore();

  const getCartQty = (id: string) => {
    return cart.find((item) => item.id === id)?.qty ?? 0;
  };

  const handleAddToCart = (item: typeof favorites[0]) => {
    addToCart({
      id: item.id,
      name: item.name,
      market: item.marketName,
      unit: item.unit,
      price: item.price,
      image: item.image,
    });
  };

  const renderFavoriteItem = ({ item }: { item: typeof favorites[0] }) => {
    const qty = getCartQty(item.id);
    const outOfStock = item.availableQuantity <= 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.image }} style={styles.cardImage} />
          <View style={styles.cardInfo}>
            <Text style={styles.marketText}>{item.marketName}</Text>
            <Text style={styles.nameText} numberOfLines={2}>{item.name}</Text>
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
            onPress={() => toggleFavorite(item)}
          >
            <Ionicons name="heart" size={24} color={Colors.error} />
          </Pressable>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Giá hiện tại</Text>
            <Text style={[styles.priceText, outOfStock && styles.priceOutOfStock]}>
              {outOfStock ? '—' : formatPrice(item.price)}
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
              <Pressable style={styles.addBtn} onPress={() => handleAddToCart(item)}>
                <Ionicons name="add" size={18} color={Colors.onPrimary} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sản phẩm yêu thích</Text>
        <Text style={styles.headerSub}>Danh sách mặt hàng đã đánh dấu</Text>
      </View>

      {favorites.length === 0 ? (
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
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavoriteItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 3,
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
});
