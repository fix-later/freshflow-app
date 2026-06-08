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
import { UserRole } from '../../../constants/roles';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';

// Dev-only: mock users for testing role-based navigation
const MOCK_USERS: { label: string; role: UserRole }[] = [
  { label: 'Nhà hàng', role: UserRole.RESTAURANT },
  { label: 'Market Agent', role: UserRole.MARKET_AGENT },
  { label: 'Hub Staff', role: UserRole.HUB_STAFF },
  { label: 'Tài xế', role: UserRole.DRIVER },
];

export function LoginScreen() {
  const navigation = useNavigation();
  const { signIn, sessionExpired, clearSessionExpired } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);

  const handleLogin = () => {
    // TODO: real API call — for now fallback to dev flow
    if (!email || !password) return;
    // Mock: interpret email prefix as role hint or default to RESTAURANT
    const role = UserRole.RESTAURANT;
    signIn(
      { id: '1', email, name: email.split('@')[0] || 'User', role },
      'mock-token',
    );
  };

  const handleDevLogin = (role: UserRole) => {
    signIn(
      { id: '1', email: 'dev@freshflow.vn', name: 'Dev User', role },
      'mock-token-dev',
    );
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
          {/* ─── Brand Section ─────────────── */}
          <View style={styles.brandSection}>
            <View style={styles.brandDeco} />
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="sprout" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>FreshFlow</Text>
            <Text style={styles.brandSub}>Đăng nhập để tiếp tục</Text>
          </View>

          {/* ─── Session Expired Banner ──────── */}
          {sessionExpired && (
            <View style={styles.expiredBanner}>
              <Ionicons name="time-outline" size={18} color="#92400E" />
              <Text style={styles.expiredText}>
                Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
              </Text>
              <Pressable onPress={clearSessionExpired} hitSlop={8}>
                <Ionicons name="close" size={18} color="#92400E" />
              </Pressable>
            </View>
          )}

          {/* ─── Form Card ─────────────────── */}
          <View style={styles.formCard}>
            {/* Email */}
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

            {/* Password */}
            <Text style={[styles.label, { marginTop: 16 }]}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Forgot password */}
            <Pressable
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ForgotPassword' as never)}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </Pressable>

            {/* Login button */}
            <Button
              title="ĐĂNG NHẬP"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleLogin}
              disabled={!email || !password}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <Pressable onPress={() => navigation.navigate('Register' as never)}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
            </Pressable>
            </View>
          </View>

          {/* ─── Dev Mode ──────────────────── */}
          <Pressable
            style={styles.devToggle}
            onPress={() => setShowDevMode(!showDevMode)}
          >
            <Text style={styles.devToggleText}>
              {showDevMode ? '▲ Ẩn' : '⚙️'} Dev Mode
            </Text>
          </Pressable>

          {showDevMode && (
            <View style={styles.devCard}>
              <Text style={styles.devTitle}>Chọn vai trò (mock)</Text>
              {MOCK_USERS.map(({ label, role }) => (
                <Pressable
                  key={role}
                  style={styles.devButton}
                  onPress={() => handleDevLogin(role)}
                >
                  <Text style={styles.devButtonText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default LoginScreen;

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

  // ─── Brand ───────────────────────────────
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
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSub: {
    marginTop: 6,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // ─── Form ────────────────────────────────
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // ─── Button ──────────────────────────────
  loginButton: {
    marginTop: 20,
    borderRadius: 14,
  },

  // ─── Divider ─────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // ─── Register ────────────────────────────
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },

  // ─── Dev Mode ────────────────────────────
  devToggle: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  devToggleText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  devCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  devButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  devButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  bottomSpacer: {
    height: 40,
  },

  // ─── Session Expired Banner ───────────────
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  expiredText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
});
