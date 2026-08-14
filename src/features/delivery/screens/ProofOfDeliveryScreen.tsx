import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { driverApi } from '../api/driverApi';
import { uploadProofOfDelivery } from '../services/proofOfDeliveryUpload';
import { driverRouteStore } from '../store/driverRouteStore';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type Props = NativeStackScreenProps<DriverStackParamList, 'ProofOfDelivery'>;

type ProofMethod = 'photo' | 'signature';

const METHODS: { id: ProofMethod; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { id: 'photo', icon: 'camera', label: 'Ảnh' },
  { id: 'signature', icon: 'create', label: 'Chữ ký' },
];

// ── Signature canvas (WebView) ──────────────────────────────────────────────
const SIGNATURE_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;background:#F8F9FA;}canvas{display:block;width:100%;height:100%;touch-action:none;}</style></head><body><canvas id="c"></canvas><script>
var canvas=document.getElementById('c');
var ctx=canvas.getContext('2d');
var drawing=false;
function resize(){canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;}
resize();
ctx.strokeStyle='#1a1a2e';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
function pos(e){var r=canvas.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*(canvas.width/r.width),y:(t.clientY-r.top)*(canvas.height/r.height)};}
canvas.addEventListener('mousedown',function(e){drawing=true;var p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);});
canvas.addEventListener('mousemove',function(e){if(!drawing)return;var p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
canvas.addEventListener('mouseup',function(){drawing=false;notify();});
canvas.addEventListener('touchstart',function(e){e.preventDefault();drawing=true;var p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);});
canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!drawing)return;var p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
canvas.addEventListener('touchend',function(){drawing=false;notify();});
function notify(){var data=canvas.toDataURL('image/png');window.ReactNativeWebView.postMessage(JSON.stringify({type:'signature',data:data}));}
function clear(){ctx.clearRect(0,0,canvas.width,canvas.height);window.ReactNativeWebView.postMessage(JSON.stringify({type:'clear'}));}
document.addEventListener('message',function(e){if(e.data==='clear')clear();});
window.addEventListener('message',function(e){if(e.data==='clear')clear();});
</script></body></html>`;

function SignatureCanvas({ onCapture, onClear }: { onCapture: (data: string) => void; onClear: () => void }) {
  const webRef = useRef<WebView>(null);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'signature') onCapture(msg.data);
      else if (msg.type === 'clear') onClear();
    } catch {}
  };

  const handleClear = () => {
    webRef.current?.injectJavaScript("clear(); true;");
    onClear();
  };

  return (
    <View style={styles.sigWrap}>
      <View style={styles.sigCanvas}>
        <WebView
          ref={webRef}
          source={{ html: SIGNATURE_HTML }}
          style={{ flex: 1, borderRadius: 12 }}
          scrollEnabled={false}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={['*']}
        />
      </View>
      <Pressable style={styles.clearBtn} onPress={handleClear}>
        <Ionicons name="refresh-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.clearBtnText}>Xoá chữ ký</Text>
      </Pressable>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export function ProofOfDeliveryScreen({ route, navigation }: Props) {
  const { deliveryId } = route.params;
  const stop = driverRouteStore.getStop(deliveryId);

  const [method, setMethod] = useState<ProofMethod>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState<string>('');

  const proofReady =
    (method === 'photo' && photoUri !== null) ||
    (method === 'signature' && signatureData !== null);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập camera để chụp ảnh.');
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

  const handleSubmit = async () => {
    const localUri = method === 'photo' ? photoUri : signatureData;
    if (!localUri) return;

    setSubmitting(true);
    try {
      await uploadProofOfDelivery(deliveryId, localUri);
      await driverApi.updateDeliveryStatus(deliveryId, 'DELIVERED');
      driverRouteStore.setDeliveryStatus(deliveryId, 'delivered');

      const now = new Date();
      setDeliveredAt(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ' · ' + now.toLocaleDateString('vi-VN'),
      );
      setSuccess(true);
    } catch (submitError) {
      Alert.alert('Lỗi', getApiErrorMessage(submitError, 'Không thể xác nhận giao hàng. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
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

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.successScreen}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Đã giao thành công!</Text>
          <Text style={styles.successSub}>{stop.restaurantName}</Text>
          <Text style={styles.successTime}>{deliveredAt}</Text>

          {method === 'photo' && photoUri && (
            <Image source={{ uri: photoUri }} style={styles.successPhoto} resizeMode="cover" />
          )}

          <View style={styles.methodBadge}>
            <Ionicons
              name={METHODS.find(m => m.id === method)?.icon ?? 'checkmark-circle-outline'}
              size={14}
              color={Colors.success}
            />
            <Text style={styles.methodBadgeText}>
              Bằng chứng: {METHODS.find(m => m.id === method)?.label}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.backNavBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="list-outline" size={16} color={Colors.onPrimary} />
            <Text style={styles.backNavBtnText}>Về danh sách điểm dừng</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── Stop summary ── */}
        <View style={styles.stopCard}>
          <View style={styles.stopNumBadge}>
            <Text style={styles.stopNumText}>#{stop.order}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stopName}>{stop.restaurantName}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="receipt-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.stopAddress} numberOfLines={1}>
                Đơn #{stop.orderId.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Chọn phương thức xác nhận</Text>

        {/* ── Method tabs ── */}
        <View style={styles.methodRow}>
          {METHODS.map(m => (
            <Pressable
              key={m.id}
              style={[styles.methodTab, method === m.id && styles.methodTabActive]}
              onPress={() => setMethod(m.id)}
            >
              <Ionicons
                name={m.icon}
                size={20}
                color={method === m.id ? Colors.driverPrimary : Colors.textMuted}
              />
              <Text style={[styles.methodLabel, method === m.id && styles.methodLabelActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Method content ── */}
        <View style={styles.contentCard}>
          {method === 'photo' && (
            <>
              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                  <Pressable style={styles.retakeBtn} onPress={handleTakePhoto}>
                    <Ionicons name="refresh" size={14} color={Colors.driverPrimary} />
                    <Text style={styles.retakeBtnText}>Chụp lại</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoCapturePlaceholder} onPress={handleTakePhoto}>
                  <View style={styles.cameraIconWrap}>
                    <Ionicons name="camera" size={40} color={Colors.driverPrimary} />
                  </View>
                  <Text style={styles.placeholderTitle}>Chụp ảnh bằng chứng giao hàng</Text>
                  <Text style={styles.placeholderSub}>
                    Chụp ảnh gói hàng, chứng từ hoặc khu vực giao hàng để làm bằng chứng.
                  </Text>
                  <View style={styles.cameraBtn}>
                    <Ionicons name="camera-outline" size={16} color={Colors.driverOnPrimary} />
                    <Text style={styles.cameraBtnText}>Mở camera</Text>
                  </View>
                </Pressable>
              )}
            </>
          )}

          {method === 'signature' && (
            <SignatureCanvas
              onCapture={data => setSignatureData(data)}
              onClear={() => setSignatureData(null)}
            />
          )}
        </View>

        {/* ── Status hint ── */}
        {!proofReady && (
          <View style={styles.hintBox}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
            <Text style={styles.hintText}>
              {method === 'photo' && 'Chụp ảnh để tiếp tục xác nhận giao hàng.'}
              {method === 'signature' && 'Ký tên vào khung bên trên để tiếp tục.'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Submit footer ── */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, (!proofReady || submitting) && styles.submitBtnDisabled]}
          onPress={proofReady && !submitting ? handleSubmit : undefined}
          disabled={!proofReady || submitting}
        >
          {submitting ? (
            <Text style={styles.submitBtnText}>Đang xác nhận...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={Colors.driverOnPrimary} />
              <Text style={styles.submitBtnText}>Xác nhận giao thành công</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  stopNumBadge: {
    backgroundColor: Colors.driverPrimary, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  stopNumText: { fontSize: 12, fontWeight: '800', color: Colors.driverOnPrimary },
  stopName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 3 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopAddress: { flex: 1, fontSize: 12, color: Colors.textMuted },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  methodRow: { flexDirection: 'row', gap: 8 },
  methodTab: {
    flex: 1, alignItems: 'center', gap: 5,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  methodTabActive: {
    borderColor: Colors.driverPrimary,
    backgroundColor: Colors.driverPrimaryLight,
  },
  methodLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  methodLabelActive: { color: Colors.driverPrimary },

  contentCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },

  // Photo
  photoCapturePlaceholder: {
    padding: 28, alignItems: 'center', gap: 10,
  },
  cameraIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.driverPrimaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  placeholderTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  placeholderSub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.driverPrimary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  cameraBtnText: { fontSize: 13, fontWeight: '700', color: Colors.driverOnPrimary },
  photoPreviewWrap: { gap: 0 },
  photoPreview: { width: '100%', height: 240 },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  retakeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.driverPrimary },

  // Signature
  sigWrap: { gap: 0 },
  sigCanvas: { height: 320, borderRadius: 12, overflow: 'hidden' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, padding: 10,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  clearBtnText: { fontSize: 12, color: Colors.textMuted },

  // Hint
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.warningLight, borderRadius: 10, padding: 10,
  },
  hintText: { flex: 1, fontSize: 12, color: Colors.textSecondary },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    padding: 16,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.driverPrimary,
    borderRadius: 14, paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: Colors.driverOnPrimary, fontWeight: '700', fontSize: 15 },

  // Success screen
  successScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.success, shadowOpacity: 0.4,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  successTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary },
  successSub: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  successTime: { fontSize: 13, color: Colors.textMuted },
  successPhoto: {
    width: '100%', height: 180,
    borderRadius: 14, marginTop: 4,
  },
  methodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  methodBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  backNavBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.driverPrimary,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    marginTop: 8, alignSelf: 'stretch',
  },
  backNavBtnText: { color: Colors.driverOnPrimary, fontWeight: '700', fontSize: 15 },
});
