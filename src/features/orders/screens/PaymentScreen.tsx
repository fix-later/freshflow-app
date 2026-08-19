import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import type { CartItem } from '../../../store/cartStore';
import { formatQuantityWithUnit, getQuantityUnit } from '../../../utils/quantity';

type PaymentMethod = 'cod' | 'bank_transfer';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; sub: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng', sub: 'Trả tiền mặt cho người giao hàng (COD)', icon: 'payments' },
  { id: 'bank_transfer', label: 'Chuyển khoản ngân hàng', sub: 'Chuyển khoản trước, đối chiếu khi xác nhận đơn', icon: 'account-balance' },
];

interface PaymentScreenProps {
  visible: boolean;
  cart: CartItem[];
  subtotal: number;
  onBack: () => void;
  onClose: () => void;
  onDone: () => void;
}

export function PaymentScreen({
  visible,
  cart,
  subtotal,
  onBack,
  onClose,
  onDone,
}: PaymentScreenProps) {
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const insets = useSafeAreaInsets();
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const total = subtotal;
  const itemCount = cart.length;
  const totalQuantity = cart.reduce((sum, item) => sum + item.qty, 0);
  const firstUnit = getQuantityUnit(cart[0]?.unit);
  const hasSingleUnit = cart.every((item) => getQuantityUnit(item.unit) === firstUnit);

  const handleConfirm = () => {
    setPlacing(true);
    setTimeout(() => {
      setPlacing(false);
      setPlaced(true);
    }, 700);
  };

  const handleDone = () => {
    setPlaced(false);
    setMethod('cod');
    onDone();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        {placed ? (
          <View style={styles.successWrap}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color={Colors.onPrimary} />
            </View>
            <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
            <Text style={styles.successSub}>
              Đơn hàng {itemCount} mặt hàng
              {hasSingleUnit ? ` (${formatQuantityWithUnit(totalQuantity, firstUnit)})` : ''} trị giá{' '}
              {total.toLocaleString('vi-VN')}đ đã được ghi nhận.
            </Text>
            <Pressable style={styles.successBtn} onPress={handleDone}>
              <Text style={styles.successBtnText}>Về trang chủ</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
              <Pressable onPress={onBack} style={styles.headerBtn}>
                <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
              </Pressable>
              <Text style={styles.headerTitle}>Thanh toán</Text>
              <Pressable onPress={onClose} style={styles.headerBtn}>
                <MaterialIcons name="close" size={22} color={Colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
              {PAYMENT_METHODS.map((m) => {
                const selected = method === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.methodCard, selected && styles.methodCardSelected]}
                    onPress={() => setMethod(m.id)}
                  >
                    <View style={[styles.methodIcon, selected && styles.methodIconSelected]}>
                      <MaterialIcons name={m.icon} size={20} color={selected ? Colors.onPrimary : Colors.primary} />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodLabel}>{m.label}</Text>
                      <Text style={styles.methodSub}>{m.sub}</Text>
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}

              <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tạm tính ({itemCount} mặt hàng)</Text>
                  <Text style={styles.summaryValue}>{subtotal.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Tổng cộng</Text>
                  <Text style={styles.summaryTotalValue}>{total.toLocaleString('vi-VN')}đ</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <View>
                <Text style={styles.footerLabel}>Tổng cộng</Text>
                <Text style={styles.footerTotal}>{total.toLocaleString('vi-VN')}đ</Text>
              </View>
              <Pressable
                style={[styles.confirmBtn, placing && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={placing}
              >
                <Text style={styles.confirmBtnText}>{placing ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
    backgroundColor: Colors.surface,
  },
  headerBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },
  body: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginBottom: 10, marginTop: 4 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceVariant,
  },
  methodCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSelected: { backgroundColor: Colors.primary },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  methodSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  summaryDivider: { height: 1, backgroundColor: Colors.surfaceVariant, marginVertical: 8 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  summaryTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  footerLabel: { fontSize: 12, color: Colors.textMuted },
  footerTotal: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 19, fontWeight: '800', color: Colors.onSurface, marginBottom: 8 },
  successSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  successBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  successBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
});
