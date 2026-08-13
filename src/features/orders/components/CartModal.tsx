import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { Text, TextInput } from '../../../components/ui/Text';
import { useCartStore } from '../../../store/cartStore';

function formatPrice(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
  /** marketProductId → live available stock, used only to cap the qty stepper. Omit to leave uncapped. */
  stockByMarketProductId?: Record<string, number>;
}

/**
 * Cart drawer shared by every screen with a cart FAB (Orders list, Favorites) so
 * "view cart" never has to leave the screen the user is on — only "proceed to
 * checkout" hands off to the Orders tab's CreateOrder flow via `onCheckout`.
 */
export function CartModal({
  visible,
  onClose,
  onCheckout,
  stockByMarketProductId = {},
}: CartModalProps) {
  const insets = useSafeAreaInsets();
  const { cart, cartCount, cartTotal, removeFromCart, updateItemQty, updateItemNote, clearCart } =
    useCartStore();
  const isCartEmpty = cart.length === 0;
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.cartScreen} edges={['bottom']}>
        <View style={[styles.cartScreenHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onClose} style={styles.cartScreenClose}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
          </Pressable>
          <Text style={styles.cartScreenTitle}>Giỏ hàng ({cartCount})</Text>
          {!isCartEmpty ? (
            <Pressable onPress={() => setShowClearConfirm(true)}>
              <Text style={styles.cartScreenClear}>Xoá tất cả</Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {isCartEmpty ? (
          <View style={styles.emptyCartContainer}>
            <View style={styles.emptyCartIconWrap}>
              <Ionicons name="cart-outline" size={56} color={Colors.outline} />
            </View>
            <Text style={styles.emptyCartTitle}>Giỏ hàng của bạn đang trống</Text>
            <Text style={styles.emptyCartSub}>
              Hãy quay lại trang mua sắm và thêm những nông sản chất lượng vào giỏ nhé!
            </Text>
            <Pressable style={styles.emptyCartBtn} onPress={onClose}>
              <Text style={styles.emptyCartBtnText}>MUA SẮM NGAY</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              data={cart}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cartScreenList}
              renderItem={({ item }) => {
                // One case ("kiện") of this line's product — the stepper's unit, not 1kg.
                // Falls back to 1 for a line whose product carried no packing data when
                // it was added (see `CartItem.packWeightKg`'s doc comment).
                const step = item.packWeightKg && item.packWeightKg > 0 ? item.packWeightKg : 1;
                const rawMax = stockByMarketProductId[item.id] ?? Number.MAX_SAFE_INTEGER;
                const maxQuantity =
                  rawMax === Number.MAX_SAFE_INTEGER ? rawMax : Math.floor(rawMax / step) * step;

                return (
                  <View style={styles.cartScreenItem}>
                    <View style={styles.cartScreenItemRow}>
                      <Image source={{ uri: item.image }} style={styles.cartScreenItemImg} />
                      <View style={styles.cartScreenItemInfo}>
                        <Text style={styles.cartScreenItemName}>{item.name}</Text>
                        <Text style={styles.cartScreenItemMarket}>
                          {item.market} • {item.unit}
                        </Text>
                        <Text numeric style={styles.cartScreenItemPrice}>
                          {formatPrice(item.price * item.qty)}
                        </Text>
                      </View>
                      <View style={styles.cartScreenItemQty}>
                        <Pressable
                          style={styles.cartScreenQtyBtn}
                          onPress={() => {
                            if (item.qty <= step) removeFromCart(item.id);
                            else updateItemQty(item.id, item.qty - step);
                          }}
                        >
                          <MaterialIcons name="remove" size={16} color={Colors.primaryText} />
                        </Pressable>
                        <Text numeric style={styles.cartScreenQtyText}>{item.qty}</Text>
                        <Pressable
                          style={styles.cartScreenQtyBtn}
                          disabled={item.qty >= maxQuantity}
                          onPress={() => updateItemQty(item.id, Math.min(maxQuantity, item.qty + step))}
                        >
                          <MaterialIcons name="add" size={16} color={Colors.primaryText} />
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
                );
              }}
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
                    <Text numeric style={styles.cartScreenSummaryValue}>
                      {formatPrice(cartTotal)}
                    </Text>
                  </View>
                  <View style={styles.cartScreenSummaryRow}>
                    <Text style={styles.cartScreenSummaryLabel}>Phí vận chuyển</Text>
                    <Text style={styles.cartScreenSummaryValue}>Sẽ xác nhận sau</Text>
                  </View>
                  <View style={styles.cartScreenSummaryRow}>
                    <Text style={styles.cartScreenSummaryLabel}>Giảm giá</Text>
                    <Text
                      numeric
                      style={[styles.cartScreenSummaryValue, { color: Colors.error }]}
                    >
                      – 0đ
                    </Text>
                  </View>
                  <View style={styles.cartScreenSummaryDivider} />
                  <View style={styles.cartScreenSummaryRow}>
                    <Text numeric style={styles.cartScreenSummaryTotal}>Tổng cộng</Text>
                    <Text numeric style={styles.cartScreenSummaryTotalValue}>
                      {formatPrice(cartTotal)}
                    </Text>
                  </View>
                </View>
              }
            />

            <View style={styles.cartScreenCheckoutBar}>
              <View>
                <Text style={styles.cartScreenCheckoutLabel}>Tạm tính</Text>
                <Text numeric style={styles.cartScreenCheckoutTotal}>{formatPrice(cartTotal)}</Text>
              </View>
              <Pressable
                style={[
                  styles.cartScreenCheckoutBtn,
                  isCartEmpty && styles.cartScreenCheckoutBtnDisabled,
                ]}
                disabled={isCartEmpty}
                onPress={onCheckout}
              >
                <Text style={styles.cartScreenCheckoutBtnText}>
                  {isCartEmpty ? 'Thêm sản phẩm trước' : 'Tiến hành thanh toán'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* ── Custom Clear-cart Confirm Modal ── */}
      <Modal
        visible={showClearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}
      >
        <Pressable
          style={styles.confirmOverlay}
          onPress={() => setShowClearConfirm(false)}
        >
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-bin" size={30} color={Colors.error} />
            </View>

            <Text style={styles.confirmTitle}>Xoá giỏ hàng?</Text>
            <Text style={styles.confirmBody}>
              Tất cả sản phẩm trong giỏ sẽ bị xoá.{`\n`}Thao tác này không thể hoàn tác.
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancel}
                onPress={() => setShowClearConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Huỷ</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDelete}
                onPress={() => {
                  setShowClearConfirm(false);
                  clearCart();
                }}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.onPrimary} />
                <Text style={styles.confirmDeleteText}>Xoá tất cả</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cartScreen: { flex: 1, backgroundColor: Colors.background },
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
  cartScreenTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.onSurface },
  cartScreenClear: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.error },
  cartScreenList: { paddingBottom: 180 },
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
  cartScreenItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  cartScreenItemInfo: { flex: 1, gap: 2 },
  cartScreenItemName: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.onSurface },
  cartScreenItemMarket: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.outline },
  cartScreenItemPrice: {
    fontSize: 15,
    fontFamily: Fonts.monoSemibold,
    color: Colors.onSurface,
    marginTop: 4,
  },
  cartScreenItemQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    fontFamily: Fonts.bold,
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
  cartScreenVoucherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartScreenVoucherInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.onSurface,
  },
  cartScreenVoucherBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartScreenVoucherBtnText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.bold,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartScreenSummaryLabel: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.outline },
  cartScreenSummaryValue: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.onSurface,
  },
  cartScreenSummaryDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },
  cartScreenSummaryTotal: {
    fontSize: 16,
    fontFamily: Fonts.monoSemibold,
    color: Colors.onSurface,
  },
  cartScreenSummaryTotalValue: {
    fontSize: 18,
    fontFamily: Fonts.monoSemibold,
    color: Colors.primaryText,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartScreenCheckoutLabel: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.outline },
  cartScreenCheckoutTotal: {
    fontSize: 20,
    fontFamily: Fonts.monoSemibold,
    color: Colors.onSurface,
  },
  cartScreenCheckoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cartScreenCheckoutBtnDisabled: { backgroundColor: Colors.surfaceVariant },
  cartScreenCheckoutBtnText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyCartIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyCartTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  emptyCartSub: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyCartBtn: {
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
  emptyCartBtnText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  /* ── Confirm clear-cart modal ── */
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancel: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
  },
  confirmDelete: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E05050',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#E05050',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  confirmDeleteText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.onPrimary,
  },
});
