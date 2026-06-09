import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/ui/Button';
import { authApi } from '../api/authApi';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds
const OTP_EXPIRES_IN = 10 * 60; // seconds

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;

  // ─── OTP inputs ──────────────────────────
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ─── State ───────────────────────────────
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRES_IN);

  // ─── Auto-send OTP on mount ───────────────
  useEffect(() => {
    sendOtp();
  }, []);

  // ─── Timers ───────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(c - 1, 0));
      setExpiresIn((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sendOtp = async () => {
    setIsResending(true);
    try {
      await authApi.requestVerification(email);
      setCooldown(RESEND_COOLDOWN);
      setExpiresIn(OTP_EXPIRES_IN);
    } catch {
      // Anti-oracle: BE luôn trả success dù email có tồn tại hay không
    } finally {
      setIsResending(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    await sendOtp();
  };

  // ─── OTP input handling ───────────────────
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    if (digits.length === OTP_LENGTH) {
      setOtp(digits.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  // ─── Verify ───────────────────────────────
  const otpValue = otp.join('');
  const isOtpComplete = otpValue.length === OTP_LENGTH;
  const isExpired = expiresIn <= 0;

  useEffect(() => {
    if (isOtpComplete && !isVerifying && !isExpired) {
      Keyboard.dismiss();
      handleVerify();
    }
  }, [otpValue, isOtpComplete, isExpired, isVerifying]);

  const handleVerify = async () => {
    if (!isOtpComplete || isExpired) return;
    setIsVerifying(true);
    try {
      await authApi.verifyEmail(email, otpValue);
      setOtp(Array(OTP_LENGTH).fill(''));
      Alert.alert(
        'Xác thực thành công!',
        'Email của bạn đã được xác thực. Tài khoản nhà hàng đang chờ quản trị viên xét duyệt trước khi có thể đăng nhập.',
        [{ text: 'Về đăng nhập', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }],
      );
    } catch (err: any) {
      const code: string = err?.response?.data?.code ?? '';
      let body = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      if (code === 'OTP_INVALID') {
        body = 'Mã xác thực không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại hoặc gửi mã mới.';
      } else if (!err?.response) {
        body = 'Không có kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
      }
      Alert.alert('Xác thực thất bại', body, [{ text: 'Đã hiểu' }]);
      // Reset OTP on error
      setOtp(Array(OTP_LENGTH).fill(''));
      setFocusedIndex(0);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ─── Back ───────────────────────── */}
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            <Text style={styles.backText}>Quay lại</Text>
          </Pressable>

        {/* ─── Brand ──────────────────────── */}
        <View style={styles.brandSection}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="email-check-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>Xác thực Email</Text>
          <Text style={styles.brandSub}>
            Mã xác thực đã được gửi đến{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
        </View>

        {/* ─── Form Card ──────────────────── */}
        <View style={styles.formCard}>
          <Text style={styles.otpLabel}>Nhập mã 6 chữ số</Text>

          <View style={[styles.timerCard, isExpired && styles.timerCardExpired]}>
            <View style={styles.timerIconWrap}>
              <Ionicons
                name={isExpired ? 'alert-circle-outline' : 'time-outline'}
                size={18}
                color={isExpired ? Colors.danger : Colors.primary}
              />
            </View>
            <View style={styles.timerTextWrap}>
              <Text style={styles.timerLabel}>
                {isExpired ? 'Mã đã hết hạn' : 'Mã còn hiệu lực'}
              </Text>
              <Text style={[styles.timerValue, isExpired && styles.timerValueExpired]}>
                {formatTime(expiresIn)}
              </Text>
            </View>
          </View>

          {/* OTP Inputs */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(0).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.otpInput,
                  otp[i] ? styles.otpInputFilled : null,
                  focusedIndex === i ? styles.otpInputFocused : null,
                  isExpired ? styles.otpInputExpired : null,
                ]}
                value={otp[i]}
                onChangeText={(t) => {
                  // Handle paste (long text input)
                  if (t.length > 1) { handlePaste(t); return; }
                  handleOtpChange(t, i);
                }}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                onFocus={() => setFocusedIndex(i)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                textAlign="center"
                editable={!isExpired && !isVerifying}
              />
            ))}
          </View>

          <Text style={styles.helperText}>
            {isExpired
              ? 'Mã xác thực đã hết hạn. Vui lòng bấm gửi lại để nhận mã mới.'
              : 'Kiểm tra cả hộp thư spam nếu không thấy email.'}
          </Text>

          {/* Verify button */}
          <Button
            title={isVerifying ? 'ĐANG XÁC THỰC...' : 'XÁC THỰC EMAIL'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleVerify}
            disabled={!isOtpComplete || isVerifying || isExpired}
            style={styles.verifyButton}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Không nhận được mã?</Text>
            <Pressable onPress={handleResend} disabled={cooldown > 0 || isResending}>
              <Text style={[styles.resendLink, (cooldown > 0 || isResending) && styles.resendDisabled]}>
                {cooldown > 0
                  ? `Gửi lại sau ${cooldown}s`
                  : isResending
                    ? 'Đang gửi mã...'
                    : 'Gửi lại mã'}
              </Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

export default VerifyEmailScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },

  // ─── Back ────────────────────────────────
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },

  // ─── Brand ───────────────────────────────
  brandSection: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 24,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandSub: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Form Card ───────────────────────────
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },

  // ─── Timer ───────────────────────────────
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight ?? '#E8F5E9',
    marginBottom: 22,
  },
  timerCardExpired: {
    backgroundColor: '#FEE2E2',
  },
  timerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextWrap: {
    minWidth: 118,
  },
  timerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  timerValue: {
    marginTop: 1,
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  timerValueExpired: {
    color: Colors.danger,
  },

  // ─── OTP inputs ──────────────────────────
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    minWidth: 42,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight ?? '#E8F5E9',
  },
  otpInputFocused: {
    borderColor: Colors.secondary,
    backgroundColor: '#FFFFFF',
  },
  otpInputExpired: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    color: Colors.danger,
  },

  // ─── Helper ──────────────────────────────
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },

  // ─── Button ──────────────────────────────
  verifyButton: {
    marginTop: 24,
    borderRadius: 14,
  },

  // ─── Resend ──────────────────────────────
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    gap: 6,
  },
  resendText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
    textAlign: 'center',
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
});
