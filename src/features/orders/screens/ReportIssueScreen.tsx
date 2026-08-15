import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import {
  orderApi,
  type IssueType,
  type OrderDto,
  type OrderItemDto,
  type ReportIssuePayload,
} from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ReportIssue'>;

const ISSUE_OPTIONS: { id: IssueType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'missing', label: 'Thiếu hàng', icon: 'cube-outline' },
  { id: 'damaged', label: 'Hư hỏng', icon: 'alert-circle-outline' },
  { id: 'wrong', label: 'Sai hàng', icon: 'close-circle-outline' },
];

interface ItemIssueForm {
  enabled: boolean;
  issueType: IssueType;
  affectedQuantity: number;
  description: string;
}

export function ReportIssueScreen({ route, navigation }: Props) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map of orderItemId -> ItemIssueForm
  const [issueForms, setIssueForms] = useState<Record<string, ItemIssueForm>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    setError(null);
    try {
      const data = await orderApi.getById(orderId);
      setOrder(data);

      // Initialize issue forms for all items
      const initialMap: Record<string, ItemIssueForm> = {};
      (data.items ?? []).forEach((it) => {
        initialMap[it.orderItemId] = {
          enabled: false,
          issueType: 'missing',
          affectedQuantity: 1,
          description: '',
        };
      });
      setIssueForms(initialMap);
    } catch {
      setError('Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    fetchOrder();
  }, [fetchOrder]);

  const toggleItemEnabled = (orderItemId: string) => {
    setIssueForms((prev) => {
      const current = prev[orderItemId] ?? {
        enabled: false,
        issueType: 'missing',
        affectedQuantity: 1,
        description: '',
      };
      return {
        ...prev,
        [orderItemId]: {
          ...current,
          enabled: !current.enabled,
        },
      };
    });
  };

  const updateItemForm = (orderItemId: string, patch: Partial<ItemIssueForm>) => {
    setIssueForms((prev) => {
      const current = prev[orderItemId] ?? {
        enabled: true,
        issueType: 'missing',
        affectedQuantity: 1,
        description: '',
      };
      return {
        ...prev,
        [orderItemId]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const handleQtyChange = (it: OrderItemDto, delta: number) => {
    const current = issueForms[it.orderItemId];
    if (!current) return;
    const nextQty = Math.max(1, Math.min(it.quantity, current.affectedQuantity + delta));
    updateItemForm(it.orderItemId, { affectedQuantity: nextQty });
  };

  const activeIssueItems = (order?.items ?? []).filter(
    (it) => issueForms[it.orderItemId]?.enabled,
  );

  const handleSubmitAll = async () => {
    if (activeIssueItems.length === 0) {
      Alert.alert('Chưa chọn sản phẩm', 'Vui lòng chọn ít nhất một sản phẩm để báo sự cố.');
      return;
    }

    // Validate that all enabled items have a non-empty description
    for (const it of activeIssueItems) {
      const form = issueForms[it.orderItemId];
      if (!form.description.trim()) {
        Alert.alert(
          'Thiếu mô tả chi tiết',
          `Vui lòng nhập mô tả sự cố cho món "${it.productNameSnapshot || 'Sản phẩm'}".`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      for (const it of activeIssueItems) {
        const form = issueForms[it.orderItemId];
        const payload: ReportIssuePayload = {
          orderItemId: it.orderItemId,
          issueType: form.issueType,
          affectedQuantity: form.affectedQuantity,
          description: form.description.trim(),
        };
        await orderApi.reportIssue(orderId, payload);
      }

      Alert.alert(
        'Đã gửi báo cáo thành công',
        `Đã ghi nhận báo cáo sự cố cho ${activeIssueItems.length} sản phẩm. Bộ phận hỗ trợ sẽ phản hồi sớm nhất.`,
        [{ text: 'Hoàn tất', onPress: () => navigation.goBack() }],
      );
    } catch (err: unknown) {
      Alert.alert(
        'Không thể gửi báo cáo',
        getApiErrorMessage(err, 'Đã xảy ra lỗi khi gửi sự cố. Vui lòng thử lại.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={Colors.danger} />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy đơn hàng'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); void fetchOrder(); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (order.status !== 'delivered') {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={44} color={Colors.warning} />
          <Text style={styles.errorText}>
            Chỉ có thể báo sự cố sau khi đơn hàng đã giao thành công.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const items = order.items ?? [];
  const orderCode = (order.orderId || '').replaceAll('-', '').slice(0, 8).toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* Order Header Summary */}
          <View style={styles.orderSummaryCard}>
            <Ionicons name="receipt-outline" size={20} color={Colors.deepTeal} />
            <View style={styles.orderSummaryMeta}>
              <Text style={styles.orderCodeText}>Báo sự cố đơn hàng #{orderCode}</Text>
              <Text style={styles.orderSubText}>Bật chọn các món gặp sự cố trong danh sách bên dưới</Text>
            </View>
          </View>

          {/* List of All Items in Order */}
          <View style={styles.itemListWrap}>
            {items.map((it) => {
              const form = issueForms[it.orderItemId] ?? {
                enabled: false,
                issueType: 'missing',
                affectedQuantity: 1,
                description: '',
              };

              return (
                <View key={it.orderItemId} style={[styles.itemCard, form.enabled && styles.itemCardEnabled]}>
                  {/* Header Row of Item Card */}
                  <Pressable style={styles.itemCardHeader} onPress={() => toggleItemEnabled(it.orderItemId)}>
                    <View style={[styles.checkbox, form.enabled && styles.checkboxChecked]}>
                      {form.enabled ? (
                        <Ionicons name="checkmark" size={16} color={Colors.onPrimary} />
                      ) : null}
                    </View>
                    <View style={styles.itemHeaderMeta}>
                      <Text style={styles.itemNameText} numberOfLines={1}>
                        {it.productNameSnapshot || 'Sản phẩm'}
                      </Text>
                      <Text style={styles.itemOrderQtyText}>Số lượng trong đơn: {it.quantity} kg / đơn vị</Text>
                    </View>
                    <Text style={[styles.toggleText, form.enabled && styles.toggleTextActive]}>
                      {form.enabled ? 'Đang báo lỗi' : '+ Báo sự cố'}
                    </Text>
                  </Pressable>

                  {/* Expanded Issue Sub-Form when Enabled */}
                  {form.enabled ? (
                    <View style={styles.expandedSubForm}>
                      <View style={styles.divider} />

                      {/* Issue Type Selector */}
                      <Text style={styles.subLabel}>Loại sự cố</Text>
                      <View style={styles.issueChipsRow}>
                        {ISSUE_OPTIONS.map((opt) => {
                          const active = form.issueType === opt.id;
                          return (
                            <Pressable
                              key={opt.id}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => updateItemForm(it.orderItemId, { issueType: opt.id })}
                            >
                              <Ionicons
                                name={opt.icon}
                                size={14}
                                color={active ? Colors.primaryText : Colors.textMuted}
                              />
                              <Text
                                style={[styles.chipText, active && styles.chipTextActive]}
                                numberOfLines={1}
                              >
                                {opt.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {/* Affected Quantity Stepper */}
                      <View style={styles.rowBetween}>
                        <Text style={styles.subLabel}>Số lượng bị ảnh hưởng</Text>
                        <Text style={styles.qtyLimitText}>Tối đa {it.quantity} kg</Text>
                      </View>

                      <View style={styles.stepperWrap}>
                        <Pressable
                          style={[styles.stepBtn, form.affectedQuantity <= 1 && styles.stepBtnDisabled]}
                          onPress={() => handleQtyChange(it, -1)}
                          disabled={form.affectedQuantity <= 1}
                        >
                          <Ionicons name="remove" size={16} color={form.affectedQuantity <= 1 ? Colors.textMuted : Colors.textPrimary} />
                        </Pressable>

                        <Text style={styles.stepValText} numeric>{form.affectedQuantity} kg</Text>

                        <Pressable
                          style={[styles.stepBtn, form.affectedQuantity >= it.quantity && styles.stepBtnDisabled]}
                          onPress={() => handleQtyChange(it, 1)}
                          disabled={form.affectedQuantity >= it.quantity}
                        >
                          <Ionicons name="add" size={16} color={form.affectedQuantity >= it.quantity ? Colors.textMuted : Colors.textPrimary} />
                        </Pressable>
                      </View>

                      {/* Description Textarea */}
                      <Text style={styles.subLabel}>Mô tả sự cố món này *</Text>
                      <TextInput
                        style={styles.textArea}
                        placeholder="Mô tả chi tiết tình trạng (ví dụ: Giao thiếu 1kg, bao bị rách)..."
                        placeholderTextColor={Colors.textMuted}
                        value={form.description}
                        onChangeText={(text) => updateItemForm(it.orderItemId, { description: text })}
                        multiline
                        maxLength={200}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submitBtn,
            (activeIssueItems.length === 0 || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={() => void handleSubmitAll()}
          disabled={activeIssueItems.length === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.submitBtnText}>
                {activeIssueItems.length > 0
                  ? `GỬI BÁO CÁO (${activeIssueItems.length} SẢN PHẨM)`
                  : 'CHỌN SẢN PHẨM CẦN BÁO LỖI'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  body: { padding: 16, gap: 14, paddingBottom: 180 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.medium },
  errorText: { fontSize: 13, color: Colors.danger, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  retryBtnText: { color: Colors.onPrimary, fontFamily: Fonts.bold, fontSize: 13 },

  // Order summary card
  orderSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderSummaryMeta: { flex: 1 },
  orderCodeText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.deepTeal },
  orderSubText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Item List
  itemListWrap: { gap: 12 },
  itemCard: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemCardEnabled: {
    borderColor: Colors.primary,
    backgroundColor: '#FAFCF9',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemHeaderMeta: { flex: 1 },
  itemNameText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textPrimary },
  itemOrderQtyText: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontFamily: Fonts.medium },
  toggleText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted },
  toggleTextActive: { color: Colors.primaryText },

  // Expanded Form
  expandedSubForm: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 4 },
  subLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.textPrimary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLimitText: { fontSize: 10, color: Colors.textMuted, fontFamily: Fonts.monoSemibold },

  // Chips
  issueChipsRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 11, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  chipTextActive: { color: Colors.primaryText, fontFamily: Fonts.bold },

  // Stepper
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepValText: { fontSize: 15, fontFamily: Fonts.monoBold, color: Colors.textPrimary },

  // Textarea
  textArea: {
    minHeight: 64,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: Fonts.medium,
    textAlignVertical: 'top',
  },

  footer: {
    padding: 14,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.onPrimary },
});
