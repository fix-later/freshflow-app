import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import type { HubStackParamList } from '../../../navigation/types';
import { HUB_BATCHES } from '../data/hubOperations';

type Props = NativeStackScreenProps<HubStackParamList, 'QualityCheck'>;
type QualityStatus = 'pending' | 'passed' | 'review' | 'failed';

export function QualityCheckScreen({ route, navigation }: Props) {
  const batch = HUB_BATCHES.find((item) => item.id === route.params.batchId) ?? HUB_BATCHES[0];
  const [statuses, setStatuses] = useState<Record<string, QualityStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const checkedCount = Object.values(statuses).filter((status) => status !== 'pending').length;
  const hasIssue = Object.values(statuses).some((status) => status === 'review' || status === 'failed');
  const completed = checkedCount === batch.products.length;

  const progress = useMemo(() => Math.round((checkedCount / batch.products.length) * 100), [checkedCount, batch.products.length]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.progressHeader}>
          <View style={styles.progressCopy}><Text style={styles.progressTitle}>{batch.code}</Text><Text style={styles.progressText}>{checkedCount}/{batch.products.length} mặt hàng đã kiểm tra</Text></View>
          <Text style={styles.progressPercent}>{progress}%</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {batch.products.map((product, index) => {
            const status = statuses[product.id] ?? 'pending';
            const needsNote = status === 'review' || status === 'failed';
            return (
              <View key={product.id} style={[styles.card, status === 'failed' && styles.cardFailed, status === 'review' && styles.cardReview]}>
                <View style={styles.productRow}>
                  <View style={[styles.productSwatch, { backgroundColor: product.imageColor }]}><Text style={styles.productIndex}>{index + 1}</Text></View>
                  <View style={styles.productCopy}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{product.expectedQuantity} {product.unit} thực nhận</Text></View>
                  <QualityIcon status={status} />
                </View>
                <View style={styles.statusControl}>
                  <StatusButton label="Đạt" icon="checkmark" active={status === 'passed'} tone="passed" onPress={() => setStatuses((current) => ({ ...current, [product.id]: 'passed' }))} />
                  <StatusButton label="Xem xét" icon="alert" active={status === 'review'} tone="review" onPress={() => setStatuses((current) => ({ ...current, [product.id]: 'review' }))} />
                  <StatusButton label="Lỗi" icon="close" active={status === 'failed'} tone="failed" onPress={() => setStatuses((current) => ({ ...current, [product.id]: 'failed' }))} />
                </View>
                {needsNote && (
                  <TextInput
                    value={notes[product.id] ?? ''}
                    onChangeText={(value) => setNotes((current) => ({ ...current, [product.id]: value }))}
                    placeholder="Mô tả tình trạng sản phẩm"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.noteInput}
                  />
                )}
              </View>
            );
          })}

          {hasIssue && (
            <View style={styles.evidenceCard}>
              <View style={styles.evidenceHeading}><View><Text style={styles.evidenceTitle}>Ảnh bằng chứng</Text><Text style={styles.evidenceSubtitle}>Bắt buộc với mặt hàng lỗi</Text></View><Ionicons name="camera-outline" size={21} color={Colors.primary} /></View>
              {imageUri ? (
                <Pressable onPress={pickImage}><Image source={{ uri: imageUri }} style={styles.evidenceImage} /></Pressable>
              ) : (
                <Pressable style={styles.uploadButton} onPress={pickImage}><Ionicons name="image-outline" size={22} color={Colors.primary} /><Text style={styles.uploadText}>Thêm ảnh từ thiết bị</Text></Pressable>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {hasIssue && <Pressable style={styles.incidentButton} onPress={() => navigation.navigate('IncidentReport', { batchId: batch.id })}><Ionicons name="warning-outline" size={18} color="#8A5900" /></Pressable>}
          <Pressable
            disabled={!completed}
            style={[styles.completeButton, !completed && styles.completeButtonDisabled]}
            onPress={() => navigation.navigate('HubTabs', { screen: 'Sorting' })}
          >
            <Text style={styles.completeText}>Hoàn tất kiểm tra</Text><Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function QualityIcon({ status }: { status: QualityStatus }) {
  const config = status === 'passed'
    ? { icon: 'checkmark-circle' as const, color: Colors.success }
    : status === 'review'
      ? { icon: 'alert-circle' as const, color: Colors.warning }
      : status === 'failed'
        ? { icon: 'close-circle' as const, color: Colors.danger }
        : { icon: 'ellipse-outline' as const, color: Colors.textMuted };
  return <Ionicons name={config.icon} size={22} color={config.color} />;
}

function StatusButton({ label, icon, active, tone, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; tone: 'passed' | 'review' | 'failed'; onPress: () => void }) {
  const color = tone === 'passed' ? Colors.success : tone === 'review' ? '#8A5900' : Colors.danger;
  const background = tone === 'passed' ? Colors.successLight : tone === 'review' ? Colors.warningLight : Colors.dangerLight;
  return <Pressable onPress={onPress} style={[styles.statusButton, active && { borderColor: color, backgroundColor: background }]}><Ionicons name={icon} size={14} color={active ? color : Colors.textMuted} /><Text style={[styles.statusButtonText, active && { color }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceContainerLowest },
  screen: { flex: 1, backgroundColor: Colors.background },
  progressHeader: { backgroundColor: Colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  progressCopy: { flex: 1 },
  progressTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  progressText: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  progressPercent: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  progressTrack: { width: '100%', height: 5, borderRadius: 3, backgroundColor: Colors.surfaceContainerHigh, marginTop: 9, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  card: { borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 12 },
  cardReview: { borderColor: '#D9B967' },
  cardFailed: { borderColor: Colors.danger },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productSwatch: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  productIndex: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  productCopy: { flex: 1, paddingHorizontal: 9 },
  productName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  productMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  statusControl: { flexDirection: 'row', gap: 6, marginTop: 11 },
  statusButton: { flex: 1, height: 34, borderRadius: 7, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statusButtonText: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  noteInput: { minHeight: 40, borderRadius: 7, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow, color: Colors.textPrimary, fontSize: 10, paddingHorizontal: 10, marginTop: 9 },
  evidenceCard: { borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 12 },
  evidenceHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  evidenceTitle: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  evidenceSubtitle: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  uploadButton: { height: 62, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: Colors.successLight, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  uploadText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  evidenceImage: { width: '100%', height: 130, borderRadius: 8, marginTop: 10 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 10, flexDirection: 'row', gap: 8 },
  incidentButton: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#D9B967', backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  completeButton: { flex: 1, height: 44, borderRadius: 8, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  completeButtonDisabled: { backgroundColor: Colors.textMuted },
  completeText: { fontSize: 11, fontWeight: '800', color: Colors.onPrimary },
});
