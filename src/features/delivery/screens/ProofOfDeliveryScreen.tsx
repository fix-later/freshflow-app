import { useRef, useState } from 'react';
import {
  Alert,
  Image,
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
import { WebView } from 'react-native-webview';
import { Colors } from '../../../constants/colors';
import { type DriverStackParamList } from '../../../navigation/types';
import { MOCK_STOP_MAP } from '../mockData';
import { updateStopStatus } from '../stopStatusStore';

type Props = NativeStackScreenProps<DriverStackParamList, 'ProofOfDelivery'>;

type ProofMethod = 'photo' | 'otp' | 'signature' | 'qr';

const METHODS: { id: ProofMethod; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { id: 'photo', icon: 'camera', label: 'Ảnh' },
  { id: 'otp', icon: 'keypad', label: 'OTP' },
  { id: 'signature', icon: 'create', label: 'Chữ ký' },
  { id: 'qr', icon: 'qr-code', label: 'QR Code' },
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

// ── OTP Box Input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  const LEN = 6;

  return (
    <View style={styles.otpWrap}>
      <Text style={styles.otpHint}>
        Nhập mã OTP được cung cấp bởi nhà hàng để xác nhận giao hàng.
      </Text>
      <Pressable style={styles.otpBoxRow} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length: LEN }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.otpBox,
              value.length === i && styles.otpBoxActive,
              value.length > i && styles.otpBoxFilled,
            ]}
          >
            <Text style={styles.otpChar}>{value[i] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, LEN))}
          keyboardType="numeric"
          maxLength={LEN}
          style={styles.otpHiddenInput}
          autoFocus={false}
          caretHidden
        />
      </Pressable>
      {value.length === LEN && (
        <View style={styles.otpSuccessRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.otpSuccessText}>Mã OTP hợp lệ</Text>
        </View>
      )}
    </View>
  );
}

// ── QR Placeholder ──────────────────────────────────────────────────────────
function QrPlaceholder() {
  return (
    <View style={styles.qrWrap}>
      <View style={styles.qrBox}>
        <Ionicons name="scan-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.qrTitle}>Quét mã QR</Text>
        <Text style={styles.qrSub}>
          Tính năng quét QR sẽ được tích hợp sau khi cài đặt{'\n'}camera module.
        </Text>
      </View>
      <View style={styles.instructBox}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.secondary} />
        <Text style={styles.instructText}>
          Yêu cầu nhà hàng hiển thị mã QR để tài xế quét xác nhận giao hàng.
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export function ProofOfDeliveryScreen({ route, navigation }: Props) {
  const { stopId } = route.params;
  const stop = MOCK_STOP_MAP[stopId];

  const [method, setMethod] = useState<ProofMethod>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const proofReady =
    (method === 'photo' && photoUri !== null) ||
    (method === 'otp' && otp.length === 6) ||
    (method === 'signature' && signatureData !== null) ||
    method === 'qr'; // QR is mock — always "ready" for now

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

  const handleSubmit = () => {
    setSubmitting(true);
    // TODO: await driverApi.submitProof(stopId, { method, photoUri, otp, signatureData })
    setTimeout(() => {
      updateStopStatus(stopId, 'delivered');
      setSubmitting(false);
      navigation.goBack(); // returns to NavigationScreen which reads from store via useFocusEffect
    }, 600);
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
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

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
                color={method === m.id ? Colors.primary : Colors.textMuted}
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
                    <Ionicons name="refresh" size={14} color={Colors.primary} />
                    <Text style={styles.retakeBtnText}>Chụp lại</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoCapturePlaceholder} onPress={handleTakePhoto}>
                  <View style={styles.cameraIconWrap}>
                    <Ionicons name="camera" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.placeholderTitle}>Chụp ảnh bằng chứng giao hàng</Text>
                  <Text style={styles.placeholderSub}>
                    Chụp ảnh gói hàng, chứng từ hoặc khu vực giao hàng để làm bằng chứng.
                  </Text>
                  <View style={styles.cameraBtn}>
                    <Ionicons name="camera-outline" size={16} color={Colors.onPrimary} />
                    <Text style={styles.cameraBtnText}>Mở camera</Text>
                  </View>
                </Pressable>
              )}
            </>
          )}

          {method === 'otp' && (
            <OtpInput value={otp} onChange={setOtp} />
          )}

          {method === 'signature' && (
            <SignatureCanvas
              onCapture={data => setSignatureData(data)}
              onClear={() => setSignatureData(null)}
            />
          )}

          {method === 'qr' && <QrPlaceholder />}
        </View>

        {/* ── Status hint ── */}
        {!proofReady && (
          <View style={styles.hintBox}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
            <Text style={styles.hintText}>
              {method === 'photo' && 'Chụp ảnh để tiếp tục xác nhận giao hàng.'}
              {method === 'otp' && 'Nhập đủ 6 chữ số mã OTP để tiếp tục.'}
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
              <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
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
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  stopNumText: { fontSize: 12, fontWeight: '800', color: Colors.onPrimary },
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
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  methodLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  methodLabelActive: { color: Colors.primary },

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
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  placeholderTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  placeholderSub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  cameraBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onPrimary },
  photoPreviewWrap: { gap: 0 },
  photoPreview: { width: '100%', height: 240 },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  retakeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // OTP
  otpWrap: { padding: 20, gap: 14 },
  otpHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  otpBoxRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', position: 'relative' },
  otpBox: {
    width: 44, height: 52, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  otpBoxFilled: { borderColor: Colors.primary + '80' },
  otpChar: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  otpHiddenInput: {
    position: 'absolute', opacity: 0,
    width: 1, height: 1, top: 0, left: 0,
  },
  otpSuccessRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  otpSuccessText: { fontSize: 13, fontWeight: '600', color: Colors.success },

  // Signature
  sigWrap: { gap: 0 },
  sigCanvas: { height: 200, borderRadius: 12, overflow: 'hidden' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, padding: 10,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  clearBtnText: { fontSize: 12, color: Colors.textMuted },

  // QR
  qrWrap: { padding: 20, gap: 12 },
  qrBox: {
    alignItems: 'center', gap: 10, padding: 28,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12, borderWidth: 1,
    borderStyle: 'dashed', borderColor: Colors.outlineVariant,
  },
  qrTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  qrSub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  instructBox: {
    flexDirection: 'row', gap: 7, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10,
  },
  instructText: { flex: 1, fontSize: 12, color: Colors.secondary, lineHeight: 17 },

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
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
