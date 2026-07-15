import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { HUB_BATCHES } from '../data/hubOperations';

type Props = NativeStackScreenProps<HubStackParamList, 'CheckIn'>;

export function CheckInScreen({ route, navigation }: Props) {
  const batch = HUB_BATCHES.find((item) => item.id === route.params.batchId) ?? HUB_BATCHES[0];
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>(
    Object.fromEntries(batch.products.map((product) => [product.id, product.expectedQuantity])),
  );

  const shortageCount = useMemo(
    () => batch.products.filter((product) => actualQuantities[product.id] < product.expectedQuantity).length,
    [actualQuantities, batch.products],
  );
  const actualTotal = batch.products.reduce((sum, product) => sum + actualQuantities[product.id], 0);

  const adjust = (productId: string, delta: number) => {
    setActualQuantities((current) => ({ ...current, [productId]: Math.max(0, (current[productId] ?? 0) + delta) }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.batchCard}>
            <View style={styles.batchTop}>
              <View style={styles.batchIcon}><Ionicons name="cube-outline" size={22} color={Colors.primaryText} /></View>
              <View style={styles.batchCopy}>
                <Text style={styles.batchCode}>{batch.code}</Text>
                <Text numberOfLines={1} style={styles.marketName}>{batch.marketName}</Text>
              </View>
              <View style={styles.scanBadge}><Ionicons name="scan-outline" size={15} color={Colors.primaryText} /><Text style={styles.scanText}>Đã quét</Text></View>
            </View>
            <View style={styles.batchInfo}>
              <Info label="Giờ đến" value={batch.arrivalTime} numeric />
              <Info label="Biển số" value={batch.vehicle} numeric />
              <Info label="Người giao" value={batch.driver} />
            </View>
          </View>

          <View style={styles.headingRow}>
            <View><Text style={styles.sectionTitle}>Kiểm đếm mặt hàng</Text><Text style={styles.sectionSubtitle}>Nhập số lượng thực nhận tại Hub</Text></View>
            <Text style={styles.itemCount}>{batch.products.length} mặt hàng</Text>
          </View>

          <View style={styles.productList}>
            {batch.products.map((product, index) => {
              const actual = actualQuantities[product.id];
              const shortage = actual < product.expectedQuantity;
              return (
                <View key={product.id} style={[styles.productCard, shortage && styles.productCardShortage]}>
                  <View style={styles.productTop}>
                    <View style={[styles.productSwatch, { backgroundColor: product.imageColor }]}><Text style={styles.productIndex}>{index + 1}</Text></View>
                    <View style={styles.productCopy}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.expectedText}>Dự kiến: {product.expectedQuantity} {product.unit}</Text>
                    </View>
                    {shortage && <View style={styles.shortageBadge}><Ionicons name="alert-circle" size={13} color="#8A5900" /><Text style={styles.shortageText}>Thiếu {product.expectedQuantity - actual}</Text></View>}
                  </View>
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Thực nhận</Text>
                    <View style={styles.stepper}>
                      <Pressable accessibilityLabel={`Giảm ${product.name}`} style={styles.stepButton} onPress={() => adjust(product.id, -1)}><Ionicons name="remove" size={18} color={Colors.primaryText} /></Pressable>
                      <View style={styles.quantityValueWrap}><Text style={[styles.quantityValue, shortage && styles.quantityValueShortage]}>{actual}</Text><Text style={styles.quantityUnit}>{product.unit}</Text></View>
                      <Pressable accessibilityLabel={`Tăng ${product.name}`} style={styles.stepButton} onPress={() => adjust(product.id, 1)}><Ionicons name="add" size={18} color={Colors.primaryText} /></Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {shortageCount > 0 && (
            <Pressable style={styles.warningCard} onPress={() => navigation.navigate('IncidentReport', { batchId: batch.id })}>
              <View style={styles.warningIcon}><Ionicons name="warning-outline" size={20} color="#8A5900" /></View>
              <View style={styles.warningCopy}><Text style={styles.warningTitle}>{shortageCount} mặt hàng có chênh lệch</Text><Text style={styles.warningText}>Ghi nhận sự cố trước khi hoàn tất nhận hàng.</Text></View>
              <Ionicons name="chevron-forward" size={18} color="#8A5900" />
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}><Text style={styles.footerLabel}>Tổng thực nhận</Text><Text style={styles.footerValue}>{actualTotal} kg</Text></View>
          <Pressable style={styles.completeButton} onPress={() => navigation.navigate('QualityCheck', { batchId: batch.id })}>
            <Text style={styles.completeButtonText}>Tiếp tục kiểm chất lượng</Text><Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Info({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <View style={styles.infoItem}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={1} numeric={numeric} style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 24 },
  batchCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 14, shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  batchTop: { flexDirection: 'row', alignItems: 'center' },
  batchIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  batchCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  batchCode: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.monoBold, color: Colors.deepTeal },
  marketName: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  scanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: Colors.primaryLight },
  scanText: { fontSize: 9, fontWeight: '700', color: Colors.primaryText },
  batchInfo: { flexDirection: 'row', marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: Colors.border },
  infoItem: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  infoLabel: { fontSize: 9, color: Colors.textMuted },
  infoValue: { fontSize: 10, fontWeight: '600', color: Colors.textPrimary, marginTop: 3 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.deepTeal },
  sectionSubtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  itemCount: { fontSize: 10, fontWeight: '600', fontFamily: Fonts.monoSemibold, color: Colors.primaryText },
  productList: { gap: 10 },
  productCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 13, shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  productCardShortage: { borderColor: '#D9B967', backgroundColor: Colors.warningLight },
  productTop: { flexDirection: 'row', alignItems: 'center' },
  productSwatch: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  productIndex: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: Fonts.monoBold },
  productCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  productName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  expectedText: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textMuted, marginTop: 3 },
  shortageBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, backgroundColor: '#FFE8B8', paddingHorizontal: 7, paddingVertical: 5 },
  shortageText: { fontSize: 8, fontWeight: '700', fontFamily: Fonts.monoBold, color: '#8A5900' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  quantityLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  stepButton: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight },
  quantityValueWrap: { minWidth: 70, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: Colors.surface },
  quantityValue: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  quantityValueShortage: { color: '#9A5B00' },
  quantityUnit: { fontSize: 9, fontFamily: Fonts.monoRegular, color: Colors.textMuted },
  warningCard: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#D9B967', backgroundColor: Colors.warningLight, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, elevation: 1 },
  warningIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFE8B8', alignItems: 'center', justifyContent: 'center' },
  warningCopy: { flex: 1 },
  warningTitle: { fontSize: 11, fontWeight: '700', color: '#704700' },
  warningText: { fontSize: 9, color: '#805B20', marginTop: 3 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerSummary: { minWidth: 82 },
  footerLabel: { fontSize: 9, color: Colors.textMuted },
  footerValue: { fontSize: 15, fontWeight: '700', fontFamily: Fonts.monoBold, color: Colors.deepTeal, marginTop: 2 },
  completeButton: { flex: 1, height: 46, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  completeButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '700' },
});
