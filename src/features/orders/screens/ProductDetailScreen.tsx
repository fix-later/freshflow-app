import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { useCartStore } from '../../../store/cartStore';
import { pricingApi } from '../../pricing/api/pricingApi';
import type { MarketProductTagDto, PriceHistoryItemDto } from '../../../types/api.types';

interface RouteParams {
  product: {
    marketProductId: string;
    productId: string;
    productName: string;
    imageUrl: string | null;
    marketId: string;
    marketName: string;
    category: string | null;
    unit: string;
    currentPrice: number;
    availableQuantity: number;
    tags: MarketProductTagDto[];
    description?: string | null;
    /**
     * How many kg one case ("kiện") of this product weighs. Optional: a
     * caller whose source data doesn't carry it (Favorites — its list
     * endpoint reports no selling-unit) simply omits the field, which reads
     * as "unknown" and falls back to a 1kg step (see `packSize`) rather than
     * `null`, which reads as "confirmed no packing code" and blocks adding
     * outright (see `hasNoPackingCode`).
     */
    sellingUnit?: { unitName: string; weightKg: number | null } | null;
  };
}

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

function packSize(product: RouteParams['product']): number {
  const weight = product.sellingUnit?.weightKg;
  return typeof weight === 'number' && weight > 0 ? weight : 1;
}

/** True only when the caller affirmatively reported no packing code — see the field's doc comment. */
function hasNoPackingCode(product: RouteParams['product']): boolean {
  if (product.sellingUnit === undefined) {
    return false;
  }
  const weight = product.sellingUnit?.weightKg;
  return !(typeof weight === 'number' && weight > 0);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params as RouteParams;

  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { cart, addToCart, updateItemQty } = useCartStore();

  const [priceHistory, setPriceHistory] = useState<PriceHistoryItemDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const step = packSize(product);
  const maxQty = Math.floor(product.availableQuantity / step) * step;
  // `maxQty < step` also catches stock under one whole case — just as
  // unorderable as none, since a fresh line always seeds at one full case.
  const disabled = hasNoPackingCode(product) || maxQty < step;
  const [quantity, setQuantity] = useState(disabled ? 0 : step);

  useEffect(() => {
    navigation.setOptions({ title: product.productName });
  }, [navigation, product.productName]);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const history = await pricingApi.getPriceHistory(product.marketId, product.productId, {
          pageSize: 5,
        });
        if (isMounted) {
          setPriceHistory(history.items);
        }
      } catch {
        if (isMounted) {
          setPriceHistory([]);
        }
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };
    void fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [product.marketId, product.productId]);

  const handleAddToCart = () => {
    if (disabled || quantity <= 0) return;
    const existing = cart.find((item) => item.id === product.marketProductId);
    const nextQuantity = Math.min(maxQty, (existing?.qty ?? 0) + quantity);

    if (existing) {
      updateItemQty(product.marketProductId, nextQuantity);
    } else {
      addToCart({
        id: product.marketProductId,
        name: product.productName,
        market: product.marketName,
        unit: product.unit,
        price: product.currentPrice,
        image: product.imageUrl ?? '',
        packWeightKg: product.sellingUnit?.weightKg ?? null,
      });
      if (nextQuantity > step) {
        updateItemQty(product.marketProductId, nextQuantity);
      }
    }
    navigation.goBack();
  };

  const favorite = isFavorite(product.marketProductId);
  const existingInCart = cart.find((item) => item.id === product.marketProductId);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={64} color={Colors.outline} />
            </View>
          )}

          <View style={styles.categoryRow}>
            <Text style={styles.category}>
              {product.category || 'Chưa phân loại'}
            </Text>
            <Pressable
              onPress={() =>
                toggleFavorite({
                  marketProductId: product.marketProductId,
                  productId: product.productId,
                  productName: product.productName,
                  imageUrl: product.imageUrl,
                  marketId: product.marketId,
                  marketName: product.marketName,
                  category: product.category,
                  unit: product.unit,
                  currentPrice: product.currentPrice,
                  availableQuantity: product.availableQuantity,
                  createdAt: new Date().toISOString(),
                })
              }
            >
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={26}
                color={favorite ? Colors.error : Colors.outline}
              />
            </Pressable>
          </View>

          {product.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {product.tags.map((tag) => (
                <View
                  key={tag.id}
                  style={[styles.tagChip, tag.pinsToTop && styles.tagChipPinned]}
                >
                  <Ionicons
                    name={tag.pinsToTop ? 'star' : 'pricetag-outline'}
                    size={12}
                    color={tag.pinsToTop ? Colors.tertiary : Colors.primaryText}
                  />
                  <Text style={[styles.tagText, tag.pinsToTop && styles.tagTextPinned]}>
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.name}>{product.productName}</Text>
          <Text style={styles.description}>
            {product.description || 'Sản phẩm được cung ứng theo giá và tồn kho hiện tại của chợ.'}
          </Text>

          <Text numeric style={styles.price}>
            {formatPrice(product.currentPrice)}
            <Text style={styles.unit}>/{product.unit}</Text>
          </Text>

          {existingInCart && (
            <Text style={styles.cartIndicator}>
              Đã thêm {existingInCart.qty} {product.unit} vào giỏ hàng
            </Text>
          )}

          <View style={styles.facts}>
            <View style={styles.fact}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primaryText} />
              <View>
                <Text style={styles.factLabel}>Chợ cung ứng</Text>
                <Text style={styles.factValue}>{product.marketName}</Text>
              </View>
            </View>
            {step > 1 ? (
              <View style={styles.fact}>
                <Ionicons name="layers-outline" size={20} color={Colors.primaryText} />
                <View>
                  <Text style={styles.factLabel}>Quy cách đóng gói</Text>
                  <Text style={styles.factValue}>{step} kg/kiện</Text>
                </View>
              </View>
            ) : null}
          </View>

          {hasNoPackingCode(product) ? (
            <Text style={styles.packMissingText}>
              Sản phẩm chưa được cấu hình quy cách đóng gói, chưa thể đặt hàng.
            </Text>
          ) : product.availableQuantity <= 0 ? (
            <Text style={styles.packMissingText}>Sản phẩm tạm hết hàng.</Text>
          ) : disabled ? (
            <Text style={styles.packMissingText}>
              Chỉ còn {product.availableQuantity} {product.unit}, không đủ 1 kiện ({step} {product.unit}).
            </Text>
          ) : null}

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Giá gần đây</Text>
            <Text style={styles.historyHint}>5 cập nhật mới nhất</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={Colors.textPrimary} style={styles.loader} />
          ) : priceHistory.length > 0 ? (
            <View style={styles.historyList}>
              {priceHistory.map((history) => (
                <View key={history.id} style={styles.historyRow}>
                  <View>
                    <Text numeric style={styles.historyPrice}>{formatPrice(history.price)}</Text>
                    <Text style={styles.historyDate}>{formatDateTime(history.recordedAt)}</Text>
                  </View>
                  <Text numeric style={styles.historyQuantity}>{history.quantity} {product.unit}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.historyEmpty}>Chưa có lịch sử giá.</Text>
          )}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.quantity}>
          <Pressable
            style={styles.quantityButton}
            disabled={quantity <= step}
            onPress={() => setQuantity((value) => Math.max(step, value - step))}
          >
            <Ionicons name="remove" size={22} color={Colors.deepTeal} />
          </Pressable>
          <Text numeric style={styles.quantityValue}>{quantity}</Text>
          <Pressable
            style={styles.quantityButton}
            disabled={quantity >= maxQty}
            onPress={() => setQuantity((value) => Math.min(maxQty, value + step))}
          >
            <Ionicons name="add" size={22} color={Colors.deepTeal} />
          </Pressable>
        </View>
        <Pressable
          style={[
            styles.addButton,
            disabled && styles.addButtonDisabled,
          ]}
          disabled={disabled}
          onPress={handleAddToCart}
        >
          <Ionicons name="bag-add-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.addText}>Thêm vào giỏ</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default ProductDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
  },
  placeholder: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  category: {
    fontSize: 12,
    color: Colors.primaryText,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  tagChipPinned: { backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: '#FDE68A' },
  tagText: { fontSize: 10, color: Colors.primaryText, fontWeight: '700' },
  tagTextPinned: { color: Colors.tertiary },
  name: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 31,
    color: Colors.deepTeal,
    fontWeight: '800',
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  price: {
    marginTop: 14,
    fontSize: 24,
    color: Colors.primaryText,
    fontWeight: '800',
  },
  unit: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  facts: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  fact: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
  },
  factLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  factValue: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 15,
    color: Colors.deepTeal,
    fontWeight: '700',
  },
  historyHint: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyList: {
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyPrice: {
    fontSize: 14,
    color: Colors.deepTeal,
    fontWeight: '600',
  },
  historyDate: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.textMuted,
  },
  historyQuantity: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  historyEmpty: {
    paddingVertical: 16,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 6,
  },
  quantityButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 17,
    color: Colors.deepTeal,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: Colors.surfaceContainerHigh,
    elevation: 0,
    shadowOpacity: 0,
  },
  addText: {
    fontSize: 16,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  cartIndicator: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.primaryText,
    fontWeight: '600',
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  packMissingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
});
