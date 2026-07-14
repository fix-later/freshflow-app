import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import {
  RestaurantText as Text,
  RestaurantTextInput as TextInput,
} from '../../restaurant/components/RestaurantText';
import { RestaurantColors as Colors, RestaurantFonts } from '../../restaurant/theme';
import { HUB_BATCHES } from '../data/hubOperations';

type Props = NativeStackScreenProps<HubStackParamList, 'IncidentReport'>;
type IncidentType = 'DAMAGED' | 'MISSING' | 'WRONG_ITEM' | 'OTHER';

const INCIDENT_TYPES: Array<{ id: IncidentType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'DAMAGED', label: 'Hàng hư hỏng', icon: 'images-outline' },
  { id: 'MISSING', label: 'Thiếu số lượng', icon: 'remove-circle-outline' },
  { id: 'WRONG_ITEM', label: 'Sai mặt hàng', icon: 'swap-horizontal-outline' },
  { id: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal-circle-outline' },
];

export function IncidentReportScreen({ route, navigation }: Props) {
  const batch = HUB_BATCHES.find((item) => item.id === route.params?.batchId);
  const [incidentType, setIncidentType] = useState<IncidentType>('DAMAGED');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const canSubmit = description.trim().length >= 10;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const submit = () => {
    Alert.alert('Đã gửi báo cáo', 'Sự cố đã được ghi nhận và chuyển đến Quản lý vận hành.', [
      { text: 'Đóng', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {batch && (
            <View style={styles.contextCard}>
              <View style={styles.contextIcon}><Ionicons name="cube-outline" size={20} color={Colors.primaryText} /></View>
              <View style={styles.contextCopy}><Text style={styles.contextLabel}>LÔ HÀNG LIÊN QUAN</Text><Text style={styles.contextCode}>{batch.code}</Text><Text numberOfLines={1} style={styles.contextMarket}>{batch.marketName}</Text></View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          )}

          <Text style={styles.sectionTitle}>Loại sự cố</Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((item) => {
              const active = incidentType === item.id;
              return (
                <Pressable key={item.id} style={[styles.typeButton, active && styles.typeButtonActive]} onPress={() => setIncidentType(item.id)}>
                  <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
                  <Ionicons name={item.icon} size={19} color={active ? Colors.primaryText : Colors.textMuted} />
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.labelRow}><Text style={styles.sectionTitle}>Mô tả chi tiết</Text><Text style={styles.required}>Bắt buộc</Text></View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả tình trạng, số lượng ảnh hưởng và cách xử lý tạm thời..."
            placeholderTextColor={Colors.textMuted}
            multiline
            textAlignVertical="top"
            maxLength={1000}
            style={styles.descriptionInput}
          />
          <Text style={styles.characterCount}>{description.length}/1000</Text>

          <View style={styles.labelRow}><Text style={styles.sectionTitle}>Ảnh bằng chứng</Text><Text style={styles.optional}>Khuyến nghị</Text></View>
          {imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <Pressable accessibilityLabel="Xóa ảnh" style={styles.removeImage} onPress={() => setImageUri(null)}><Ionicons name="close" size={17} color="#FFFFFF" /></Pressable>
            </View>
          ) : (
            <Pressable style={styles.uploadArea} onPress={pickImage}>
              <View style={styles.uploadIcon}><Ionicons name="camera-outline" size={23} color={Colors.primaryText} /></View>
              <Text style={styles.uploadTitle}>Chụp hoặc chọn ảnh</Text>
              <Text style={styles.uploadHint}>Ảnh giúp Operations xử lý nhanh hơn</Text>
            </Pressable>
          )}

          <View style={styles.notice}><Ionicons name="information-circle-outline" size={19} color={Colors.secondary} /><Text style={styles.noticeText}>Sự cố thiếu hoặc hư hỏng sẽ được đối soát với đơn hàng và chuyển Operations xác nhận.</Text></View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled={!canSubmit} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={submit}>
            <Ionicons name="send-outline" size={18} color={canSubmit ? Colors.onPrimary : Colors.textMuted} /><Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>Gửi báo cáo sự cố</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 24 },
  contextCard: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 13, flexDirection: 'row', alignItems: 'center', shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  contextIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  contextCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  contextLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted },
  contextCode: { fontSize: 12, fontWeight: '700', fontFamily: RestaurantFonts.monoBold, color: Colors.deepTeal, marginTop: 2 },
  contextMarket: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.deepTeal, marginTop: 18, marginBottom: 9 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { width: '48%', minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, elevation: 1 },
  typeButtonActive: { borderColor: Colors.primary600, backgroundColor: Colors.primaryLight },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.primaryText },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryText },
  typeText: { flex: 1, fontSize: 9, fontWeight: '600', color: Colors.textSecondary },
  typeTextActive: { color: Colors.primaryText },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  required: { fontSize: 8, fontWeight: '600', color: Colors.danger, marginTop: 10 },
  optional: { fontSize: 8, color: Colors.textMuted, marginTop: 10 },
  descriptionInput: { minHeight: 112, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.textPrimary, fontSize: 11, lineHeight: 17, padding: 12 },
  characterCount: { textAlign: 'right', fontSize: 8, fontFamily: RestaurantFonts.monoRegular, color: Colors.textMuted, marginTop: 4 },
  uploadArea: { height: 108, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary600, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  uploadIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 10, fontWeight: '700', color: Colors.primaryText, marginTop: 7 },
  uploadHint: { fontSize: 8, color: Colors.textMuted, marginTop: 3 },
  imageWrap: { height: 150, borderRadius: 14, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  removeImage: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 14, borderWidth: 1, borderColor: '#CBD5F0', backgroundColor: '#F1F3FF', padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 15 },
  noticeText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, padding: 10 },
  submitButton: { height: 46, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: Colors.deepTeal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  submitButtonDisabled: { backgroundColor: Colors.surfaceContainerHighest, elevation: 0, shadowOpacity: 0 },
  submitText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimary },
  submitTextDisabled: { color: Colors.textMuted },
});
