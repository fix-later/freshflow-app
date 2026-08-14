import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { uploadImageToCloudinary } from '../../../services/cloudinaryUpload';
import {
  marketProcurementApi,
  type MarketProcurementTaskDto,
  type ProcurementExceptionType,
  type ProcurementTaskItemDto,
} from '../api/marketProcurementApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

const EXCEPTION_TYPES: Array<{
  value: ProcurementExceptionType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: 'Unavailable', label: 'Không có hàng', description: 'Không thể mua mặt hàng này', icon: 'close-circle-outline' },
  { value: 'Shortfall', label: 'Thiếu số lượng', description: 'Mua được ít hơn kế hoạch', icon: 'remove-circle-outline' },
  { value: 'PriceDiscrepancy', label: 'Sai lệch giá', description: 'Giá thực tế chênh lệch lớn', icon: 'pricetag-outline' },
  { value: 'Damaged', label: 'Hàng hư hỏng', description: 'Chất lượng hàng không đạt', icon: 'warning-outline' },
];

interface Props {
  batchId: string;
  item: ProcurementTaskItemDto | null;
  visible: boolean;
  onClose: () => void;
  onSaved: (task: MarketProcurementTaskDto) => void;
}

function readError(error: unknown): string {
  return getApiErrorMessage(error, 'Không thể gửi báo cáo sự cố.');
}

export function ProcurementExceptionModal({
  batchId,
  item,
  visible,
  onClose,
  onSaved,
}: Props) {
  const [type, setType] = useState<ProcurementExceptionType>('Unavailable');
  const [quantity, setQuantity] = useState('0');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !item) return;
    setType('Unavailable');
    setQuantity(String(item.totalQuantity));
    setNote('');
    setImageUri(null);
  }, [item, visible]);

  const parsedQuantity = Number(quantity);
  const canSubmit = useMemo(() => (
    Boolean(item)
    && Number.isInteger(parsedQuantity)
    && parsedQuantity >= 0
    && note.trim().length <= 500
    && !submitting
  ), [item, note, parsedQuantity, submitting]);

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền camera', 'FreshFlow cần quyền camera để chụp ảnh bằng chứng.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền thư viện ảnh', 'FreshFlow cần quyền truy cập ảnh để đính kèm bằng chứng.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const selectEvidenceSource = () => {
    Alert.alert('Thêm ảnh bằng chứng', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: () => void capturePhoto() },
      { text: 'Chọn từ thư viện', onPress: () => void choosePhoto() },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!item || !canSubmit) return;
    setSubmitting(true);
    try {
      let proofImageUrl: string | null = null;
      if (imageUri) {
        const signature = await marketProcurementApi.getExceptionProofUploadSignature(batchId);
        proofImageUrl = await uploadImageToCloudinary(imageUri, signature);
      }

      const updated = await marketProcurementApi.reportException(batchId, {
        marketProductId: item.marketProductId,
        type,
        reportedQuantity: parsedQuantity,
        note: note.trim() || null,
        proofImageUrl,
      });
      onSaved(updated);
      onClose();
      Alert.alert('Đã ghi nhận sự cố', proofImageUrl
        ? 'Báo cáo và ảnh bằng chứng đã được lưu thành công.'
        : 'Báo cáo đã được lưu. Bạn có thể đính kèm ảnh ở lần báo cáo tiếp theo.');
    } catch (error) {
      Alert.alert('Không thể gửi báo cáo', readError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>BÁO CÁO THU MUA</Text>
              <Text style={styles.title}>Sự cố & ảnh bằng chứng</Text>
              <Text numberOfLines={1} style={styles.itemName}>{item?.productNameSnapshot}</Text>
            </View>
            <Pressable
              disabled={submitting}
              hitSlop={10}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng báo cáo sự cố"
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>LOẠI SỰ CỐ</Text>
            <View style={styles.typeList}>
              {EXCEPTION_TYPES.map((option) => {
                const selected = type === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.typeCard, selected && styles.typeCardSelected]}
                    onPress={() => setType(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                      <Ionicons
                        name={option.icon}
                        size={19}
                        color={selected ? Colors.deepTeal : Colors.textMuted}
                      />
                    </View>
                    <View style={styles.typeCopy}>
                      <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{option.label}</Text>
                      <Text style={styles.typeDescription}>{option.description}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={19}
                      color={selected ? Colors.primaryText : Colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>SỐ LƯỢNG ẢNH HƯỞNG</Text>
            <TextInput
              value={quantity}
              onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>GHI CHÚ</Text>
              <Text style={styles.counter}>{note.length}/500</Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={500}
              multiline
              textAlignVertical="top"
              placeholder="Mô tả tình trạng thực tế để Admin và Hub dễ đối chiếu..."
              placeholderTextColor={Colors.textMuted}
              style={[styles.input, styles.noteInput]}
            />

            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>ẢNH BẰNG CHỨNG</Text>
              <Text style={styles.recommended}>KHUYẾN NGHỊ</Text>
            </View>
            {imageUri ? (
              <View style={styles.imageWrap}>
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                <View style={styles.imageActions}>
                  <Pressable style={styles.imageAction} onPress={selectEvidenceSource}>
                    <Ionicons name="camera-outline" size={16} color={Colors.primaryText} />
                    <Text style={styles.imageActionText}>Chụp/chọn lại</Text>
                  </Pressable>
                  <Pressable style={styles.imageAction} onPress={() => setImageUri(null)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    <Text style={[styles.imageActionText, { color: Colors.danger }]}>Xoá ảnh</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.evidenceButton} onPress={selectEvidenceSource}>
                <View style={styles.cameraCircle}>
                  <Ionicons name="camera" size={25} color={Colors.deepTeal} />
                </View>
                <Text style={styles.evidenceTitle}>Chụp hoặc chọn ảnh</Text>
                <Text style={styles.evidenceHint}>Ảnh sẽ được upload bằng chữ ký bảo mật do backend cấp.</Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              disabled={!canSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={() => void submit()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.onPrimary} />
              )}
              <Text style={styles.submitText}>{submitting ? 'Đang tải ảnh và lưu...' : 'Gửi báo cáo sự cố'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontSize: 8, letterSpacing: 1, color: Colors.primaryText, fontFamily: Fonts.bold },
  title: { marginTop: 4, fontSize: 19, color: Colors.deepTeal, fontFamily: Fonts.extraBold },
  itemName: { marginTop: 4, fontSize: 10, color: Colors.textMuted },
  content: { padding: 16, paddingBottom: 28 },
  sectionLabel: { marginTop: 4, marginBottom: 9, fontSize: 8, letterSpacing: 0.8, color: Colors.textSecondary, fontFamily: Fonts.bold },
  typeList: { gap: 8, marginBottom: 18 },
  typeCard: { minHeight: 62, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  typeCardSelected: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  typeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerLow },
  typeIconSelected: { backgroundColor: Colors.primary },
  typeCopy: { flex: 1, minWidth: 0 },
  typeLabel: { fontSize: 11, color: Colors.textPrimary, fontFamily: Fonts.bold },
  typeLabelSelected: { color: Colors.deepTeal },
  typeDescription: { marginTop: 2, fontSize: 8, color: Colors.textMuted },
  input: { minHeight: 46, marginBottom: 18, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.textPrimary, fontSize: 12 },
  noteInput: { minHeight: 92, paddingTop: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 8, color: Colors.textMuted, fontFamily: Fonts.monoRegular },
  recommended: { fontSize: 7, color: Colors.primaryText, fontFamily: Fonts.bold },
  evidenceButton: { minHeight: 150, padding: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  cameraCircle: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  evidenceTitle: { marginTop: 10, fontSize: 11, color: Colors.deepTeal, fontFamily: Fonts.bold },
  evidenceHint: { marginTop: 5, maxWidth: 260, textAlign: 'center', fontSize: 8, lineHeight: 13, color: Colors.textMuted },
  imageWrap: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  image: { width: '100%', height: 210 },
  imageActions: { minHeight: 46, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imageAction: { minHeight: 38, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  imageActionText: { fontSize: 9, color: Colors.primaryText, fontFamily: Fonts.semibold },
  footer: { padding: 14, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  submitButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: Colors.primary },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { fontSize: 12, color: Colors.onPrimary, fontFamily: Fonts.bold },
});
