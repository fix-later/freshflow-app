import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import {
  orderApi,
  type IssueType,
  type OrderDto,
  type ReportIssuePayload,
  ISSUE_TYPE_LABEL,
} from '../api/orderApi';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'ReportIssue'>;

const ISSUE_TYPE_OPTIONS: { id: IssueType; label: string }[] = (
  Object.keys(ISSUE_TYPE_LABEL) as IssueType[]
).map((id) => ({ id, label: ISSUE_TYPE_LABEL[id] }));

// One API call only reports a single order item, so multi-item reports are queued here
// and submitted with one POST /issues request per entry.
interface DraftIssue extends ReportIssuePayload {
  key: string;
  productName: string;
}

export function ReportIssueScreen({ route, navigation }: Props) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftIssues, setDraftIssues] = useState<DraftIssue[]>([]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
  const [affectedQuantityText, setAffectedQuantityText] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    setError(null);
    try {
      const data = await orderApi.getById(orderId);
      setOrder(data);
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

  const resetForm = () => {
    setSelectedItemId(null);
    setSelectedIssueType(null);
    setAffectedQuantityText('');
    setDescription('');
  };

  const handleAddToList = () => {
    if (!selectedItemId) {
      setFormError('Vui lòng chọn sản phẩm có vấn đề.');
      return;
    }
    if (!selectedIssueType) {
      setFormError('Vui lòng chọn loại vấn đề.');
      return;
    }
    const affectedQuantity = parseInt(affectedQuantityText, 10);
    const targetItem = order?.items.find((it) => it.orderItemId === selectedItemId);
    if (!affectedQuantity || affectedQuantity <= 0) {
      setFormError('Vui lòng nhập số lượng bị ảnh hưởng hợp lệ.');
      return;
    }
    if (targetItem && affectedQuantity > targetItem.quantity) {
      setFormError(`Số lượng vượt quá số lượng đã đặt (${targetItem.quantity}).`);
      return;
    }
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError('Vui lòng mô tả chi tiết vấn đề.');
      return;
    }

    setDraftIssues((prev) => [
      ...prev,
      {
        key: `${selectedItemId}-${Date.now()}`,
        orderItemId: selectedItemId,
        issueType: selectedIssueType,
        affectedQuantity,
        description: trimmedDescription,
        productName: targetItem?.productNameSnapshot || 'Sản phẩm',
      },
    ]);
    resetForm();
  };

  const handleRemoveFromList = (key: string) => {
    setDraftIssues((prev) => prev.filter((d) => d.key !== key));
  };

  const handleSubmitAll = async () => {
    if (draftIssues.length === 0) {
      setFormError('Vui lòng thêm ít nhất một sản phẩm cần báo cáo vào danh sách.');
      return;
    }

    setSubmitting(true);
    const remaining = [...draftIssues];
    try {
      while (remaining.length > 0) {
        const next = remaining[0];
        await orderApi.reportIssue(orderId, {
          orderItemId: next.orderItemId,
          issueType: next.issueType,
          affectedQuantity: next.affectedQuantity,
          description: next.description,
        });
        remaining.shift();
        setDraftIssues((prev) => prev.filter((d) => d.key !== next.key));
      }
      Alert.alert('Đã gửi báo cáo', 'Báo cáo sự cố của bạn đã được ghi nhận.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert(
        'Không thể gửi báo cáo',
        message ?? 'Chỉ có thể báo sự cố cho đơn đã giao. Các sản phẩm chưa gửi vẫn còn trong danh sách.',
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
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy đơn hàng'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrder(); }}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const items = order.items ?? [];
  const code = (order.orderId || '').slice(0, 8).toUpperCase() || 'N/A';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={styles.warningText}>
            Báo sự cố cho đơn #{code}. Có thể báo nhiều sản phẩm khác nhau — thêm từng sản phẩm vào danh sách rồi gửi cùng lúc.
          </Text>
        </View>

        {/* ── Queued issues ── */}
        {draftIssues.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Danh sách đã thêm ({draftIssues.length})</Text>
            <View style={styles.card}>
              {draftIssues.map((draft) => (
                <View key={draft.key} style={styles.draftRow}>
                  <View style={styles.draftInfo}>
                    <Text style={styles.draftName} numberOfLines={1}>{draft.productName}</Text>
                    <Text style={styles.draftMeta}>
                      {ISSUE_TYPE_LABEL[draft.issueType]} • SL: {draft.affectedQuantity}
                    </Text>
                    <Text style={styles.draftDescription} numberOfLines={2}>{draft.description}</Text>
                  </View>
                  <Pressable style={styles.draftRemoveBtn} onPress={() => handleRemoveFromList(draft.key)}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── Add new issue form ── */}
        <Text style={styles.sectionTitle}>Thêm sản phẩm có vấn đề *</Text>
        <View style={styles.card}>
          {items.map((item) => {
            const selected = selectedItemId === item.orderItemId;
            const addedCount = draftIssues.filter((d) => d.orderItemId === item.orderItemId).length;
            return (
              <Pressable
                key={item.orderItemId}
                style={styles.reasonRow}
                onPress={() => {
                  setSelectedItemId(item.orderItemId);
                  if (formError) setFormError(null);
                }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? Colors.primary : Colors.outline}
                />
                <Text style={styles.reasonText}>
                  {item.productNameSnapshot || 'Sản phẩm'} (SL: {item.quantity})
                </Text>
                {addedCount > 0 ? (
                  <View style={styles.addedBadge}>
                    <Text style={styles.addedBadgeText}>Đã thêm x{addedCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Loại vấn đề *</Text>
        <View style={styles.card}>
          {ISSUE_TYPE_OPTIONS.map((option) => {
            const selected = selectedIssueType === option.id;
            return (
              <Pressable
                key={option.id}
                style={styles.reasonRow}
                onPress={() => {
                  setSelectedIssueType(option.id);
                  if (formError) setFormError(null);
                }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? Colors.primary : Colors.outline}
                />
                <Text style={styles.reasonText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Số lượng bị ảnh hưởng *</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.smallInput}
            placeholder="Ví dụ: 2"
            placeholderTextColor={Colors.outline}
            value={affectedQuantityText}
            onChangeText={(text) => {
              setAffectedQuantityText(text.replace(/[^0-9]/g, ''));
              if (formError) setFormError(null);
            }}
            keyboardType="number-pad"
          />
        </View>

        <Text style={styles.sectionTitle}>Mô tả chi tiết *</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.textArea}
            placeholder="Mô tả vấn đề gặp phải..."
            placeholderTextColor={Colors.outline}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (formError) setFormError(null);
            }}
            multiline
            maxLength={500}
          />
        </View>

        {formError ? <Text style={styles.errorMsgText}>{formError}</Text> : null}

        <Pressable style={styles.addBtn} onPress={handleAddToList}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Thêm vào danh sách</Text>
        </Pressable>

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmitAll}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={Colors.onError} size="small" />
            : <Text style={styles.submitBtnText}>GỬI BÁO CÁO ({draftIssues.length})</Text>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.outline, fontWeight: '500' },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  warningText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  reasonText: { flex: 1, fontSize: 14, color: Colors.onSurface },
  addedBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  smallInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.onSurface,
  },
  textArea: {
    minHeight: 90,
    padding: 14,
    fontSize: 14,
    color: Colors.onSurface,
    textAlignVertical: 'top',
  },
  errorMsgText: { fontSize: 12, color: Colors.error, marginTop: 8 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  // Queued draft issues
  draftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  draftInfo: { flex: 1 },
  draftName: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  draftMeta: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  draftDescription: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  draftRemoveBtn: { padding: 2 },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  submitBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onError, fontWeight: '700', fontSize: 15 },
});
