import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_STOP_MAP } from '../mockData';
import { updateStopStatus } from '../stopStatusStore';

type Props = NativeStackScreenProps<DriverStackParamList, 'ReportDeliveryIssue'>;

type IssueType = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
};

const ISSUE_TYPES: IssueType[] = [
  {
    id: 'no_recipient',
    icon: 'person-remove-outline',
    label: 'Không có người nhận',
    description: 'Không liên lạc được hoặc không có ai tại địa điểm giao.',
  },
  {
    id: 'wrong_address',
    icon: 'location-outline',
    label: 'Địa chỉ sai / không tìm thấy',
    description: 'Địa chỉ không chính xác hoặc không thể tìm thấy địa điểm.',
  },
  {
    id: 'refused',
    icon: 'hand-left-outline',
    label: 'Nhà hàng từ chối nhận',
    description: 'Nhà hàng từ chối nhận hàng hoặc huỷ đơn tại chỗ.',
  },
  {
    id: 'damaged',
    icon: 'warning-outline',
    label: 'Hàng hư hỏng / thiếu',
    description: 'Hàng bị hư hỏng trong quá trình vận chuyển hoặc thiếu số lượng.',
  },
  {
    id: 'traffic',
    icon: 'car-outline',
    label: 'Vấn đề giao thông',
    description: 'Kẹt xe, đường cấm hoặc tai nạn khiến không thể giao đúng hạn.',
  },
  {
    id: 'other',
    icon: 'ellipsis-horizontal-outline',
    label: 'Lý do khác',
    description: 'Vấn đề không thuộc các loại trên.',
  },
];

export function ReportDeliveryIssueScreen({ route, navigation }: Props) {
  const { stopId } = route.params;
  const stop = MOCK_STOP_MAP[stopId];

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = selectedIssue !== null && !submitting;

  const handleAttachPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập camera để chụp ảnh bằng chứng.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    const issue = ISSUE_TYPES.find(i => i.id === selectedIssue);
    Alert.alert(
      'Xác nhận báo lỗi',
      `Lý do: "${issue?.label}"\n\nSau khi xác nhận, điểm giao này sẽ được ghi nhận là không giao được.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: () => {
            setSubmitting(true);
            // TODO: await driverApi.reportIssue(stopId, { issueType: selectedIssue, notes, photoUri })
            setTimeout(() => {
              updateStopStatus(stopId, 'failed');
              setSubmitting(false);
              // Pop back to NavigationScreen — it reads from store via useFocusEffect
              navigation.goBack();
            }, 500);
          },
        },
      ],
    );
  };

  if (!stop) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={{ color: Colors.error }}>Không tìm thấy điểm giao hàng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Stop summary ── */}
          <View style={styles.stopCard}>
            <View style={styles.stopNumBadge}>
              <Text style={styles.stopNumText}>#{stop.order}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopName}>{stop.restaurantName}</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.stopAddress} numberOfLines={1}>{stop.address}</Text>
              </View>
            </View>
            <View style={styles.failedChip}>
              <Ionicons name="close-circle" size={13} color={Colors.danger} />
              <Text style={styles.failedChipText}>Không giao được</Text>
            </View>
          </View>

          {/* ── Issue type ── */}
          <Text style={styles.sectionTitle}>Lý do không giao được <Text style={styles.required}>*</Text></Text>
          <View style={styles.issueGrid}>
            {ISSUE_TYPES.map(issue => {
              const active = selectedIssue === issue.id;
              return (
                <Pressable
                  key={issue.id}
                  style={[styles.issueCard, active && styles.issueCardActive]}
                  onPress={() => setSelectedIssue(issue.id)}
                >
                  <View style={[styles.issueIconWrap, active && styles.issueIconWrapActive]}>
                    <Ionicons
                      name={issue.icon}
                      size={20}
                      color={active ? Colors.danger : Colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.issueLabel, active && styles.issueLabelActive]}>
                      {issue.label}
                    </Text>
                    {active && (
                      <Text style={styles.issueDesc}>{issue.description}</Text>
                    )}
                  </View>
                  <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* ── Notes ── */}
          <Text style={styles.sectionTitle}>Ghi chú thêm</Text>
          <View style={styles.notesWrap}>
            <TextInput
              style={styles.notesInput}
              placeholder="Mô tả chi tiết tình huống (tuỳ chọn)..."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{notes.length}/500</Text>
          </View>

          {/* ── Photo evidence ── */}
          <Text style={styles.sectionTitle}>Ảnh bằng chứng <Text style={styles.optional}>(tuỳ chọn)</Text></Text>
          {photoUri ? (
            <View style={styles.photoCard}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoActions}>
                <Pressable style={styles.photoActionBtn} onPress={handleAttachPhoto}>
                  <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
                  <Text style={styles.photoActionText}>Chụp lại</Text>
                </Pressable>
                <View style={styles.photoActionDivider} />
                <Pressable
                  style={styles.photoActionBtn}
                  onPress={() => setPhotoUri(null)}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={[styles.photoActionText, { color: Colors.danger }]}>Xoá</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.photoPlaceholder} onPress={handleAttachPhoto}>
              <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.photoPlaceholderTitle}>Chụp ảnh bằng chứng</Text>
              <Text style={styles.photoPlaceholderSub}>
                Ảnh khu vực giao, chứng minh lý do không giao được.
              </Text>
            </Pressable>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        {!canSubmit && (
          <View style={styles.footerHint}>
            <Ionicons name="alert-circle-outline" size={13} color={Colors.warning} />
            <Text style={styles.footerHintText}>Vui lòng chọn lý do trước khi gửi báo cáo.</Text>
          </View>
        )}
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={canSubmit ? handleSubmit : undefined}
          disabled={!canSubmit}
        >
          <Ionicons name="flag" size={18} color={Colors.onPrimary} />
          <Text style={styles.submitBtnText}>
            {submitting ? 'Đang gửi...' : 'Báo cáo lỗi giao hàng'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  // Stop card
  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  stopNumBadge: {
    backgroundColor: Colors.danger + '18', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.danger + '40',
  },
  stopNumText: { fontSize: 12, fontWeight: '800', color: Colors.danger },
  stopName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 3 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopAddress: { flex: 1, fontSize: 12, color: Colors.textMuted },
  failedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.danger + '10', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  failedChipText: { fontSize: 10, fontWeight: '700', color: Colors.danger },

  // Section
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 2,
  },
  required: { color: Colors.danger },
  optional: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },

  // Issue grid
  issueGrid: { gap: 8 },
  issueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  issueCardActive: {
    borderColor: Colors.danger + '60',
    backgroundColor: Colors.danger + '06',
  },
  issueIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  issueIconWrapActive: {
    backgroundColor: Colors.danger + '15',
  },
  issueLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  issueLabelActive: { color: Colors.danger },
  issueDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2, lineHeight: 15 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioCircleActive: { borderColor: Colors.danger },
  radioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger,
  },

  // Notes
  notesWrap: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  notesInput: {
    padding: 12, fontSize: 14, color: Colors.textPrimary,
    minHeight: 96, lineHeight: 20,
  },
  charCount: {
    textAlign: 'right', fontSize: 11, color: Colors.textMuted,
    paddingHorizontal: 12, paddingBottom: 8,
  },

  // Photo
  photoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: 200 },
  photoActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  photoActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, padding: 12,
  },
  photoActionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  photoActionDivider: { width: 1, backgroundColor: Colors.outlineVariant },
  photoPlaceholder: {
    alignItems: 'center', gap: 8, padding: 28,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: Colors.outlineVariant,
  },
  photoPlaceholderTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  photoPlaceholderSub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    padding: 16, gap: 8,
  },
  footerHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  footerHintText: { fontSize: 12, color: Colors.textMuted },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.danger,
    borderRadius: 14, paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
