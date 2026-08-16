import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { Text, TextInput } from '../../../components/ui/Text';
import { claimsApi, type OrderClaimDto } from '../api/claimsApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

interface FileClaimModalProps {
  visible: boolean;
  orderId: string;
  orderCode: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess: (claim: OrderClaimDto) => void;
}

export function FileClaimModal({
  visible,
  orderId,
  orderCode,
  totalAmount,
  onClose,
  onSuccess,
}: FileClaimModalProps) {
  const [amountStr, setAmountStr] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setAmountStr('');
    setReason('');
    setErrorMsg(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const parseAmount = (): number => {
    const raw = amountStr.replace(/[^0-9]/g, '');
    return parseInt(raw, 10) || 0;
  };

  const setPresetPercentage = (pct: number) => {
    const calculated = Math.round(totalAmount * pct);
    setAmountStr(calculated.toLocaleString('vi-VN'));
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMsg(null);

    const amount = parseAmount();
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền khiếu nại đền bù hợp lệ (lớn hơn 0đ).');
      return;
    }

    if (amount > totalAmount) {
      setErrorMsg(`Số tiền khiếu nại không được vượt quá giá trị đơn hàng (${totalAmount.toLocaleString('vi-VN')}đ).`);
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMsg('Vui lòng nhập lý do khiếu nại đền bù.');
      return;
    }

    if (trimmedReason.length > 500) {
      setErrorMsg('Lý do khiếu nại tối đa 500 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      const claim = await claimsApi.fileClaim(orderId, {
        amount,
        reason: trimmedReason,
      });

      resetForm();
      onSuccess(claim);
      Alert.alert(
        'Gửi khiếu nại thành công',
        `Yêu cầu khiếu nại đền bù ${amount.toLocaleString('vi-VN')}đ đã được gửi tới ban quản lý.`,
      );
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Không thể gửi khiếu nại đền bù. Vui lòng thử lại.');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAmountTextChange = (text: string) => {
    const rawDigits = text.replace(/[^0-9]/g, '');
    if (!rawDigits) {
      setAmountStr('');
      return;
    }
    const num = parseInt(rawDigits, 10);
    setAmountStr(num.toLocaleString('vi-VN'));
    setErrorMsg(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerTitleWrap}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Yêu cầu khiếu nại đền bù</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={handleClose} disabled={submitting}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Order Summary Info */}
                <View style={styles.orderBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderBannerCode}>Đơn hàng #{orderCode}</Text>
                    <Text style={styles.orderBannerSub}>
                      Tổng giá trị đơn: <Text style={styles.orderBannerTotal}>{totalAmount.toLocaleString('vi-VN')}đ</Text>
                    </Text>
                  </View>
                </View>

                {/* Error Banner */}
                {errorMsg ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Amount Section */}
                <View style={styles.fieldSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Số tiền yêu cầu đền bù *</Text>
                    <Text style={styles.maxCapText}>Tối đa {totalAmount.toLocaleString('vi-VN')}đ</Text>
                  </View>

                  {/* Preset Amount Chips */}
                  <View style={styles.presetRow}>
                    <Pressable style={styles.presetChip} onPress={() => setPresetPercentage(1.0)}>
                      <Text style={styles.presetChipText}>100% Đơn</Text>
                    </Pressable>
                    <Pressable style={styles.presetChip} onPress={() => setPresetPercentage(0.5)}>
                      <Text style={styles.presetChipText}>50% Đơn</Text>
                    </Pressable>
                    <Pressable style={styles.presetChip} onPress={() => setPresetPercentage(0.25)}>
                      <Text style={styles.presetChipText}>25% Đơn</Text>
                    </Pressable>
                  </View>

                  {/* Amount Input */}
                  <View style={styles.amountInputWrap}>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      value={amountStr}
                      onChangeText={handleAmountTextChange}
                    />
                    <Text style={styles.currencySuffix}>đ</Text>
                  </View>
                </View>

                {/* Reason Section */}
                <View style={styles.fieldSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Lý do khiếu nại đền bù *</Text>
                    <Text style={styles.charCountText}>{reason.length}/500</Text>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Mô tả lý do bạn muốn yêu cầu đền bù (ví dụ: Hàng thiếu 2kg dưa hấu, rau bị dập nát hỏng toàn bộ...)"
                    placeholderTextColor={Colors.textMuted}
                    value={reason}
                    onChangeText={(text) => { setReason(text); setErrorMsg(null); }}
                    multiline
                    maxLength={500}
                  />
                </View>

                {/* Policy Disclaimer */}
                <View style={styles.disclaimerBox}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.deepTeal} />
                  <Text style={styles.disclaimerText}>
                    Khi khiếu nại được Admin/Quản lý phê duyệt, số tiền đền bù sẽ được tự động hoàn lại trực tiếp vào hạn mức tín dụng B2B của nhà hàng.
                  </Text>
                </View>
              </ScrollView>

              {/* Footer Button */}
              <View style={styles.footer}>
                <Pressable
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.onPrimary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={18} color={Colors.onPrimary} />
                      <Text style={styles.submitBtnText}>GỬI YÊU CẦU KHIẾU NẠI</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 480,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderBannerCode: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  orderBannerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: Fonts.medium,
  },
  orderBannerTotal: {
    fontFamily: Fonts.bold,
    color: Colors.primaryText,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.danger,
    fontFamily: Fonts.medium,
    lineHeight: 16,
  },
  fieldSection: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  maxCapText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Fonts.medium,
  },
  charCountText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Fonts.monoSemibold,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.primaryText,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.monoBold,
    color: Colors.textPrimary,
  },
  currencySuffix: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
  },
  textArea: {
    minHeight: 90,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: Fonts.medium,
    textAlignVertical: 'top',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});
