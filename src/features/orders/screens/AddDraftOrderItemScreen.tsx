import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Text, TextInput } from '../../../components/ui/Text';
import { pricingApi } from '../../pricing/api/pricingApi';
import { type MarketDto, type MarketProductDto, type ProductDto } from '../../../types/api.types';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';
import { orderApi } from '../api/orderApi';
import { formatPackingRule, resolvePackingSelection } from '../utils/packing';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'AddDraftOrderItem'>;

const PRODUCT_PAGE_SIZE = 100;

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

export function AddDraftOrderItemScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [products, setProducts] = useState<MarketProductDto[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDto[]>([]);
  const [query, setQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [marketData, productData] = await Promise.all([
          pricingApi.getMarkets(),
          loadAllCatalogProducts(),
        ]);
        setMarkets(marketData);
        setCatalogProducts(productData);
        setSelectedMarketId(marketData[0]?.id ?? null);
      } catch {
        setError('Không thể tải danh sách chợ.');
      } finally {
        setLoadingMarkets(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedMarketId) {
      setProducts([]);
      return;
    }

    let active = true;
    setLoadingProducts(true);
    setError(null);
    pricingApi.getMarketProducts(selectedMarketId, { pageSize: 100 })
      .then((result) => {
        if (active) setProducts(result.items);
      })
      .catch(() => {
        if (active) setError('Không thể tải sản phẩm của chợ đã chọn.');
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMarketId]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      product.productName.toLocaleLowerCase('vi').includes(normalizedQuery),
    );
  }, [products, query]);

  const productMetadata = useMemo(
    () => new Map(catalogProducts.map((product) => [product.id, product])),
    [catalogProducts],
  );

  const quantityFor = (product: MarketProductDto) => {
    const packing = resolvePackingSelection(product, productMetadata.get(product.productId));
    return quantities[product.marketProductId] ?? packing.minimumOrderQuantity;
  };

  const changeQuantity = (product: MarketProductDto, delta: number) => {
    const packing = resolvePackingSelection(product, productMetadata.get(product.productId));
    const next = Math.min(
      packing.maxQuantity,
      Math.max(packing.minimumOrderQuantity, quantityFor(product) + delta),
    );
    setQuantities((current) => ({ ...current, [product.marketProductId]: next }));
  };

  const handleAdd = async (product: MarketProductDto) => {
    const packing = resolvePackingSelection(product, productMetadata.get(product.productId));
    if (!packing.canOrder) {
      Alert.alert(
        'Chưa thể thêm sản phẩm',
        'Sản phẩm chưa có packing code hợp lệ hoặc không đủ số kiện tối thiểu.',
      );
      return;
    }
    setAddingId(product.marketProductId);
    try {
      await orderApi.addItem(orderId, product.marketProductId, quantityFor(product));
      Alert.alert('Đã thêm sản phẩm', 'Sản phẩm đã được thêm vào bản nháp.', [
        { text: 'Xong', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Không thể thêm sản phẩm', message ?? 'Vui lòng kiểm tra tồn kho và thử lại.');
    } finally {
      setAddingId(null);
    }
  };

  const renderProduct = ({ item }: { item: MarketProductDto }) => {
    const packing = resolvePackingSelection(item, productMetadata.get(item.productId));
    const quantity = quantityFor(item);
    const unavailable = !packing.canOrder;
    const adding = addingId === item.marketProductId;
    return (
      <View style={[styles.productCard, unavailable && styles.productCardDisabled]}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.productMeta}>
            {item.category} • {formatPackingRule(packing.unit, packing.weightKg)}
          </Text>
          <Text style={styles.productPrice}>{item.currentPrice.toLocaleString('vi-VN')}đ</Text>
          <Text style={[styles.stockText, unavailable && styles.stockTextDanger]}>
            Còn {item.availableQuantity} kiện
            {!packing.isConfigured ? ' • Thiếu packing code' : ''}
          </Text>
        </View>
        {!unavailable ? (
          <View style={styles.productActions}>
            <View style={styles.quantityRow}>
              <Pressable
                style={styles.quantityButton}
                onPress={() => changeQuantity(item, -1)}
                disabled={quantity <= packing.minimumOrderQuantity || adding}
              >
                <Ionicons name="remove" size={15} color={Colors.primaryText} />
              </Pressable>
              <Text style={styles.quantityText}>{quantity}</Text>
              <Pressable
                style={styles.quantityButton}
                onPress={() => changeQuantity(item, 1)}
                disabled={quantity >= item.availableQuantity || adding}
              >
                <Ionicons name="add" size={15} color={Colors.primaryText} />
              </Pressable>
            </View>
            <Pressable
              style={[styles.addButton, adding && styles.addButtonDisabled]}
              onPress={() => handleAdd(item)}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text style={styles.addButtonText}>Thêm</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  if (loadingMarkets) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.helperText}>Đang tải danh mục sản phẩm...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <FlatList
          horizontal
          data={markets}
          keyExtractor={(market) => market.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.marketList}
          renderItem={({ item }) => {
            const selected = item.id === selectedMarketId;
            return (
              <Pressable
                style={[styles.marketChip, selected && styles.marketChipSelected]}
                onPress={() => setSelectedMarketId(item.id)}
              >
                <Text style={[styles.marketChipText, selected && styles.marketChipTextSelected]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm sản phẩm..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {loadingProducts ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleProducts}
          keyExtractor={(product) => product.marketProductId}
          renderItem={renderProduct}
          contentContainerStyle={[styles.listContent, visibleProducts.length === 0 && styles.emptyContent]}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={48} color={Colors.outline} />
              <Text style={styles.helperText}>Không tìm thấy sản phẩm phù hợp.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  marketList: { gap: 8, paddingHorizontal: 16 },
  marketChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 20,
  },
  marketChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  marketChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  marketChipTextSelected: { color: Colors.primaryText, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14, color: Colors.textPrimary },
  listContent: { gap: 10, padding: 16 },
  emptyContent: { flexGrow: 1 },
  productCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  productCardDisabled: { opacity: 0.55 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  productMeta: { marginTop: 4, fontSize: 11, color: Colors.textMuted },
  productPrice: { marginTop: 8, fontSize: 15, fontWeight: '800', color: Colors.primaryText },
  stockText: { marginTop: 3, fontSize: 11, color: Colors.textMuted },
  stockTextDanger: { color: Colors.error },
  productActions: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  quantityText: { minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  addButton: {
    minWidth: 82,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: Colors.primary,
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: Colors.onPrimary, fontSize: 12, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  helperText: { marginTop: 10, textAlign: 'center', color: Colors.textMuted },
  errorText: { marginTop: 10, textAlign: 'center', color: Colors.error },
});
