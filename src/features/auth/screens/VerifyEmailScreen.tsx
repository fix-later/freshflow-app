import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;

  // ─── OTP inputs ──────────────────────────
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ─── State ───────────────────────────────
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  // ─── Auto-send OTP on mount ───────────────
  useEffect(() => {
    sendOtp();
  }, []);

  // ─── Cooldown timer ───────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendOtp = async () => {
    setIsResending(true);
    try {
      await authApi.requestVerification(email);
      setCooldown(RESEND_COOLDOWN);
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

  const handleVerify = async () => {
    if (!isOtpComplete) return;
    setIsVerifying(true);
    try {
      await authApi.verifyEmail(email, otpValue);
      Alert.alert(
        'Xác thực thành công!',
        'Email của bạn đã được xác thực. Vui lòng chờ admin phê duyệt tài khoản trước khi đăng nhập.',
        [{ text: 'Đăng nhập', onPress: () => navigation.navigate('Login') }],
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
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
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

          {/* OTP Inputs */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(0).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.otpInput, otp[i] ? styles.otpInputFilled : null]}
                value={otp[i]}
                onChangeText={(t) => {
                  // Handle paste (long text input)
                  if (t.length > 1) { handlePaste(t); return; }
                  handleOtpChange(t, i);
                }}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                textAlign="center"
                autoFocus={i === 0}
              />
            ))}
          </View>

          <Text style={styles.helperText}>
            Mã có hiệu lực trong 10 phút. Kiểm tra cả hộp thư spam nếu không thấy.
          </Text>

          {/* Verify button */}
          <Button
            title={isVerifying ? 'ĐANG XÁC THỰC...' : 'XÁC THỰC EMAIL'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleVerify}
            disabled={!isOtpComplete || isVerifying}
            style={styles.verifyButton}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Không nhận được mã? </Text>
            <Pressable onPress={handleResend} disabled={cooldown > 0 || isResending}>
              <Text style={[styles.resendLink, (cooldown > 0 || isResending) && styles.resendDisabled]}>
                {cooldown > 0 ? `Gửi lại (${cooldown}s)` : isResending ? 'Đang gửi...' : 'Gửi lại'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: 20,
  },

  // ─── OTP inputs ──────────────────────────
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight ?? '#E8F5E9',
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
});
