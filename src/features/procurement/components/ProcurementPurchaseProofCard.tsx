import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../../../components/ui';
import { Colors } from '../../../constants/colors';

interface Props {
  value: string | null;
  editable: boolean;
  disabled?: boolean;
  onChange: (uri: string) => void;
}

export function ProcurementPurchaseProofCard({
  value,
  editable,
  disabled = false,
  onChange,
}: Props) {
  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền camera', 'FreshFlow cần quyền camera để chụp ảnh xác nhận lô hàng.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền thư viện ảnh', 'FreshFlow cần quyền truy cập ảnh để chọn ảnh xác nhận lô hàng.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
  };

  const selectSource = () => {
    Alert.alert(value ? 'Thay ảnh xác nhận' : 'Thêm ảnh xác nhận', 'Chọn nguồn ảnh', [
      { text: 'Chụp ngay', onPress: () => void capturePhoto() },
      { text: 'Chọn từ thư viện', onPress: () => void choosePhoto() },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Ionicons name="camera-outline" size={20} color={Colors.primaryText} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Ảnh xác nhận đã đủ hàng</Text>
          <Text style={styles.description}>
            Chụp toàn bộ lô hàng trước khi xác nhận đã thu mua đủ.
          </Text>
        </View>
      </View>

      {value ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="images-outline" size={27} color={Colors.textMuted} />
          <Text style={styles.placeholderText}>Chưa có ảnh xác nhận</Text>
        </View>
      )}

      {editable ? (
        <>
          <Pressable
            disabled={disabled}
            onPress={selectSource}
            style={({ pressed }) => [
              styles.button,
              (pressed || disabled) && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={value ? 'Thay ảnh xác nhận lô hàng' : 'Chụp ảnh xác nhận lô hàng'}
          >
            <Ionicons name={value ? 'camera-reverse-outline' : 'camera'} size={18} color={Colors.primaryText} />
            <Text style={styles.buttonText}>{value ? 'Chụp hoặc chọn ảnh khác' : 'Chụp ảnh xác nhận'}</Text>
          </Pressable>
          {value ? (
            <View style={styles.localNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#8A5900" />
              <Text style={styles.localNoticeText}>
                Ảnh xác nhận hiện chỉ được lưu tạm trên thiết bị này.
              </Text>
            </View>
          ) : null}
        </>
      ) : value ? (
        <View style={styles.savedRow}>
          <Ionicons name="information-circle-outline" size={17} color="#8A5900" />
          <Text style={styles.savedText}>Ảnh chỉ đang được giữ tạm trên màn hình này</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 13, marginBottom: 16 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  description: { fontSize: 10, lineHeight: 15, color: Colors.textSecondary, marginTop: 3 },
  preview: { width: '100%', height: 190, borderRadius: 11, backgroundColor: Colors.surfaceContainerHigh, marginTop: 12 },
  placeholder: { height: 112, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  placeholderText: { fontSize: 10, color: Colors.textMuted },
  button: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  buttonPressed: { opacity: 0.55 },
  buttonText: { fontSize: 11, fontWeight: '800', color: Colors.primaryText },
  localNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: 9, backgroundColor: Colors.warningLight, padding: 9, marginTop: 9 },
  localNoticeText: { flex: 1, fontSize: 9, lineHeight: 13, color: '#805B20' },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  savedText: { fontSize: 10, fontWeight: '700', color: '#805B20' },
});
