import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { theme } from '../../../config/theme';

// ─── Images ────────────────────────────────
const IMAGES = [
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

// ─── Categories ─────────────────────────────
const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: 'grid' as const },
  { id: 'rau', label: 'Rau củ', icon: 'leaf' as const },
  { id: 'thit', label: 'Thịt', icon: 'fish' as const },
  { id: 'trai-cay', label: 'Trái cây', icon: 'nutrition' as const },
  { id: 'gia-vi', label: 'Gia vị', icon: 'flask' as const },
];

// ─── Products ───────────────────────────────
interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  market: string;
  image: string;
  category: string;
}

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Cà chua sạch', unit: 'Kg', price: 35000, market: 'Hóc Môn', image: IMAGES[0], category: 'rau' },
  { id: 'p2', name: 'Hành lá tươi', unit: 'Bó', price: 8000, market: 'Hóc Môn', image: IMAGES[1], category: 'rau' },
  { id: 'p3', name: 'Thịt heo nạc', unit: 'Kg', price: 120000, market: 'Bình Điền', image: IMAGES[2], category: 'thit' },
  { id: 'p4', name: 'Thịt gà ta', unit: 'Kg', price: 95000, market: 'Bình Điền', image: IMAGES[3], category: 'thit' },
  { id: 'p5', name: 'Cá basa fillet', unit: 'Kg', price: 80000, market: 'Bình Điền', image: IMAGES[4], category: 'thit' },
  { id: 'p6', name: 'Cà rốt Đà Lạt', unit: 'Kg', price: 20000, market: 'Hóc Môn', image: IMAGES[5], category: 'rau' },
  { id: 'p7', name: 'Nấm đùi gà', unit: 'Kg', price: 65000, market: 'Hóc Môn', image: IMAGES[6], category: 'rau' },
  { id: 'p8', name: 'Khoai tây vàng', unit: 'Kg', price: 25000, market: 'Thủ Đức', image: IMAGES[7], category: 'rau' },
  { id: 'p9', name: 'Tôm sú size 20', unit: 'Kg', price: 220000, market: 'Bình Điền', image: IMAGES[8], category: 'thit' },
  { id: 'p10', name: 'Bông cải xanh', unit: 'Kg', price: 32000, market: 'Hóc Môn', image: IMAGES[9], category: 'rau' },
];

// ─── Cart item ──────────────────────────────
interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Helpers ───────────────────────────────
function formatPrice(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Screen ────────────────────────────────
export function PriceListScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const filteredProducts = PRODUCTS.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory,
  );

  const getQuantity = (productId: string) =>
    cart.find((c) => c.product.id === productId)?.quantity ?? 0;

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (existing && existing.quantity <= 1) {
        return prev.filter((c) => c.product.id !== productId);
      }
      return prev.map((c) =>
        c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c,
      );
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        <Pressable style={styles.historyBtn}>
          <Ionicons name="time-outline" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* ─── Category chips ──────────────────── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
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
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const qty = getQuantity(item.id);
          return (
            <View style={styles.productCard}>
              {/* Image */}
              <Image source={{ uri: item.image }} style={styles.productImage} />

              {/* Info */}
              <View style={styles.productInfo}>
                <Text style={styles.productMarket}>{item.market}</Text>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productUnit}>{item.unit}</Text>
                <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
              </View>

              {/* Quantity */}
              <View style={styles.qtyCol}>
                {qty > 0 ? (
                  <>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => addToCart(item)}
                    >
                      <Ionicons name="add" size={18} color={Colors.onPrimary} />
                    </Pressable>
                    <Text style={styles.qtyText}>{qty}</Text>
                    <Pressable
                      style={styles.qtyBtnMinus}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Ionicons name="remove" size={18} color={Colors.primary} />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => addToCart(item)}
                  >
                    <Ionicons name="add" size={20} color={Colors.onPrimary} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={48} color={Colors.outline} />
            <Text style={styles.emptyText}>Không có sản phẩm</Text>
          </View>
        }
      />

      {/* ─── Cart bottom bar ─────────────────── */}
      {cartCount > 0 && (
        <Pressable style={styles.cartBar} onPress={() => setShowCart(true)}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBadge}>
              <Ionicons name="cart" size={18} color={Colors.onPrimary} />
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
            <Text style={styles.cartBarTitle}>Xem giỏ hàng</Text>
          </View>
          <Text style={styles.cartBarTotal}>{formatPrice(cartTotal)}</Text>
        </Pressable>
      )}

      {/* ─── Cart Modal (foodpanda-style) ─────── */}
      <Modal
        visible={showCart}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCart(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCart(false)} />
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Giỏ hàng ({cartCount})</Text>
              <Pressable onPress={() => setCart([])}>
                <Text style={styles.modalClear}>Xoá tất cả</Text>
              </Pressable>
            </View>

            {/* Items */}
            <FlatList
              data={cart}
              keyExtractor={(item) => item.product.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <Image source={{ uri: item.product.image }} style={styles.cartItemImage} />
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemUnit}>{item.product.unit}</Text>
                  </View>
                  <View style={styles.cartQtyCol}>
                    <Pressable
                      style={styles.cartQtyBtn}
                      onPress={() => addToCart(item.product)}
                    >
                      <Ionicons name="add" size={16} color={Colors.primary} />
                    </Pressable>
                    <Text style={styles.cartQtyText}>{item.quantity}</Text>
                    <Pressable
                      style={styles.cartQtyBtn}
                      onPress={() => removeFromCart(item.product.id)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.primary} />
                    </Pressable>
                  </View>
                  <Text style={styles.cartItemPrice}>
                    {formatPrice(item.product.price * item.quantity)}
                  </Text>
                </View>
              )}
            />

            {/* Total + Place order */}
            <View style={styles.modalFooter}>
              <View>
                <Text style={styles.modalTotalLabel}>Tạm tính</Text>
                <Text style={styles.modalTotal}>{formatPrice(cartTotal)}</Text>
              </View>
              <Pressable style={styles.orderBtn}>
                <Ionicons name="receipt" size={18} color={Colors.onPrimary} />
                <Text style={styles.orderBtnText}>Đặt hàng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default PriceListScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
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

  // ─── Cart bottom bar ────────────────────
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cartBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  cartBarTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  cartBarTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onPrimary,
  },

  // ─── Cart Modal ─────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalClear: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  cartItemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cartItemUnit: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 1,
  },
  cartQtyCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    marginTop: 8,
  },
  modalTotalLabel: {
    fontSize: 12,
    color: Colors.outline,
  },
  modalTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  orderBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
