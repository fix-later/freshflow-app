import { useState } from 'react';
import {
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/ui/Button';
import { authApi } from '../api/authApi';
import { type AuthStackParamList } from '../../../navigation/types';

type RouteProps = RouteProp<AuthStackParamList, 'ResetPassword'>;

// Password must have ≥8 chars, uppercase, digit, special char
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(pw)) return 'Cần ít nhất 1 chữ hoa.';
  if (!/[0-9]/.test(pw)) return 'Cần ít nhất 1 chữ số.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Cần ít nhất 1 ký tự đặc biệt.';
  return null;
}

const ERROR_MESSAGES: Record<string, string> = {
  RESET_TOKEN_INVALID: 'Liên kết đặt lại không hợp lệ. Vui lòng yêu cầu lại.',
  RESET_TOKEN_EXPIRED: 'Liên kết đã hết hạn (15 phút). Vui lòng yêu cầu lại.',
  WEAK_PASSWORD: 'Mật khẩu không đủ mạnh. Vui lòng kiểm tra lại.',
};

export function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const token = route.params?.token ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordError = newPassword ? validatePassword(newPassword) : null;
  const confirmError =
    confirmPassword && newPassword !== confirmPassword ? 'Mật khẩu xác nhận không khớp.' : null;
  const canSubmit = !loading && !passwordError && !confirmError && !!newPassword && !!confirmPassword;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string; message?: string } } })
        ?.response?.data?.code;
      const fallback =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
      setError(ERROR_MESSAGES[code ?? ''] ?? fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Brand Section ─────────────────────────── */}
          <View style={styles.brandSection}>
            <View style={styles.brandDeco} />
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="lock-check" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>Đặt lại mật khẩu</Text>
            <Text style={styles.brandSub}>
              {done ? 'Mật khẩu đã được cập nhật' : 'Tạo mật khẩu mới cho tài khoản'}
            </Text>
          </View>

          {/* ─── Form Card ─────────────────────────────── */}
          <View style={styles.formCard}>
            {done ? (
              /* ── Success state ── */
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={56} color={Colors.primary} />
                </View>
                <Text style={styles.successTitle}>Thành công!</Text>
                <Text style={styles.successDesc}>
                  Mật khẩu của bạn đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.
                </Text>
                <Button
                  title="ĐĂNG NHẬP NGAY"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() => navigation.navigate('Login' as never)}
                  style={styles.loginBtn}
                />
              </View>
            ) : (
              /* ── Input state ── */
              <>
                <Text style={styles.cardTitle}>Tạo mật khẩu mới</Text>
                <Text style={styles.cardDesc}>
                  Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.
                </Text>

                {/* API / token error */}
                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* New password */}
                <Text style={styles.label}>Mật khẩu mới</Text>
                <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Nhập mật khẩu mới"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                    <Ionicons
                      name={showNew ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                </View>
                {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}

                {/* Confirm password */}
                <Text style={[styles.label, { marginTop: 16 }]}>Xác nhận mật khẩu</Text>
                <View style={[styles.inputWrapper, confirmError ? styles.inputError : null]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                </View>
                {confirmError && <Text style={styles.fieldError}>{confirmError}</Text>}

                <Button
                  title="ĐẶT LẠI MẬT KHẨU"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={styles.submitBtn}
                />
              </>
            )}

            {!done && (
              <View style={styles.backRow}>
                <Text style={styles.backText}>Nhớ mật khẩu? </Text>
                <Pressable onPress={() => navigation.navigate('Login' as never)}>
                  <Text style={styles.backLink}>Đăng nhập</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ─── Brand ───────────────────────────────────
  brandSection: {
    backgroundColor: Colors.primary,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  brandDeco: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSub: {
    marginTop: 6,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ─── Form Card ───────────────────────────────
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 20,
    borderRadius: 14,
  },

  // ─── Success State ───────────────────────────
  successBox: { alignItems: 'center', paddingVertical: 8 },
  successIcon: { marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginBtn: { marginTop: 16, borderRadius: 14 },

  // ─── Back to Login ───────────────────────────
  backRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  backText: { fontSize: 14, color: Colors.textSecondary },
  backLink: { fontSize: 14, fontWeight: '700', color: Colors.secondary },

  bottomSpacer: { height: 40 },
});
