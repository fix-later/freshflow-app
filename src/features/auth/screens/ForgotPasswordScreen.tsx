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
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/ui/Button';
import { authApi } from '../api/authApi';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.';
      setError(msg);
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
              <MaterialCommunityIcons name="lock-reset" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>Quên mật khẩu</Text>
            <Text style={styles.brandSub}>
              {sent
                ? 'Kiểm tra hộp thư email của bạn'
                : 'Nhập email để nhận hướng dẫn đặt lại'}
            </Text>
          </View>

          {/* ─── Form Card ─────────────────────────────── */}
          <View style={styles.formCard}>
            {sent ? (
              /* Success state */
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.successTitle}>Email đã được gửi!</Text>
                <Text style={styles.successDesc}>
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến{' '}
                  <Text style={styles.successEmail}>{email}</Text>. Vui lòng kiểm tra hộp
                  thư (kể cả thư mục spam).
                </Text>
                <Button
                  title="Gửi lại email"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={() => setSent(false)}
                  style={styles.resendBtn}
                />
              </View>
            ) : (
              /* Input state */
              <>
                <Text style={styles.cardTitle}>Đặt lại mật khẩu</Text>
                <Text style={styles.cardDesc}>
                  Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi đường dẫn để bạn tạo
                  mật khẩu mới.
                </Text>

                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.error ?? '#EF4444'} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Button
                  title="GỬI EMAIL ĐẶT LẠI"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  onPress={handleSend}
                  disabled={!email || loading}
                  style={styles.submitBtn}
                />
              </>
            )}

            {/* Back to login */}
            <View style={styles.backRow}>
              <Text style={styles.backText}>Đã nhớ ra? </Text>
              <Pressable onPress={() => navigation.navigate('Login' as never)}>
                <Text style={styles.backLink}>Quay lại đăng nhập</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

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
    marginBottom: 24,
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  submitBtn: {
    marginTop: 12,
    borderRadius: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },

  // ─── Success State ───────────────────────────
  successBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  successEmail: {
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  resendBtn: {
    marginTop: 20,
    borderRadius: 14,
  },

  // ─── Back to Login ───────────────────────────
  backRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  backText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  backLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },

  bottomSpacer: {
    height: 40,
  },
});
