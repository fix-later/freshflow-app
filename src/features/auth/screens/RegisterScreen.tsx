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
import { Colors } from '../../../constants/colors';
import { theme } from '../../../config/theme';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { signIn } = useAuthStore();

  // ─── Personal info ───────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // ─── Restaurant info ─────────────────────
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');

  // ─── Security ────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Agreement ───────────────────────────
  const [agreeTerms, setAgreeTerms] = useState(false);

  // ─── Validation ──────────────────────────
  const isFormValid =
    name.trim().length > 0 &&
    phone.trim().length >= 10 &&
    email.includes('@') &&
    restaurantName.trim().length > 0 &&
    restaurantAddress.trim().length > 0 &&
    taxCode.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    agreeTerms;

  const handleRegister = () => {
    if (!isFormValid) return;
    // Mock: auto-login after register
    signIn(
      { id: '1', email, name, role: 'RESTAURANT' },
      'mock-token-register',
    );
  };

  // ─── Reusable input ──────────────────────
  const renderInput = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    iconName: React.ComponentProps<typeof Ionicons>['name'],
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'sentences' | 'words';
      autoCorrect?: boolean;
      maxLength?: number;
      rightElement?: React.ReactNode;
    },
  ) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={iconName} size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={options?.keyboardType ?? 'default'}
          secureTextEntry={options?.secureTextEntry}
          autoCapitalize={options?.autoCapitalize ?? 'none'}
          autoCorrect={options?.autoCorrect ?? false}
          maxLength={options?.maxLength}
        />
        {options?.rightElement}
      </View>
    </>
  );

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
          {/* ─── Back ─────────────────────────── */}
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            <Text style={styles.backText}>Quay lại</Text>
          </Pressable>

          {/* ─── Brand Section ────────────────── */}
          <View style={styles.brandSection}>
            <View style={styles.brandDeco} />
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="sprout" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>Đăng ký tài khoản Nhà hàng</Text>
            <Text style={styles.brandSub}>
              Trở thành đối tác đặt hàng thực phẩm tươi sống mỗi ngày
            </Text>
          </View>

          {/* ─── Form Card ────────────────────── */}
          <View style={styles.formCard}>
            {/* ═══ SECTION: THÔNG TIN CÁ NHÂN ═══ */}
            <View style={styles.sectionRow}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionText}>THÔNG TIN CÁ NHÂN</Text>
              <View style={styles.sectionLine} />
            </View>

            {renderInput(
              'Họ tên chủ nhà hàng *',
              name,
              setName,
              'person-outline',
              'Nguyễn Văn A',
              { autoCapitalize: 'words' },
            )}

            <View style={styles.fieldGap} />

            {renderInput(
              'Số điện thoại *',
              phone,
              setPhone,
              'call-outline',
              '090 123 45 67',
              { keyboardType: 'phone-pad', maxLength: 15 },
            )}

            <View style={styles.fieldGap} />

            {renderInput(
              'Email *',
              email,
              setEmail,
              'mail-outline',
              'your@email.com',
              { keyboardType: 'email-address' },
            )}

            {/* ═══ SECTION: THÔNG TIN NHÀ HÀNG ═══ */}
            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionText}>THÔNG TIN NHÀ HÀNG</Text>
              <View style={styles.sectionLine} />
            </View>

            {renderInput(
              'Tên nhà hàng *',
              restaurantName,
              setRestaurantName,
              'restaurant-outline',
              'Nhà hàng ABC',
              { autoCapitalize: 'words' },
            )}

            <View style={styles.fieldGap} />

            {renderInput(
              'Địa chỉ nhà hàng *',
              restaurantAddress,
              setRestaurantAddress,
              'location-outline',
              'Số 123, Đường ABC, Quận 1, TP.HCM',
              { autoCapitalize: 'sentences' },
            )}

            <View style={styles.fieldGap} />

            {/* ─── Mã số thuế ─────────────────── */}
            <Text style={styles.label}>Mã số thuế *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={taxCode}
                onChangeText={setTaxCode}
                placeholder="0123456789"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={14}
              />
              <View style={styles.taxBadge}>
                <Text style={styles.taxBadgeText}>MST</Text>
              </View>
            </View>
            <Text style={styles.helperText}>
              Mã số thuế giúp xác thực thông tin doanh nghiệp của bạn
            </Text>

            {/* ═══ SECTION: BẢO MẬT ═══ */}
            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionText}>BẢO MẬT</Text>
              <View style={styles.sectionLine} />
            </View>

            {renderInput(
              'Mật khẩu *',
              password,
              setPassword,
              'lock-closed-outline',
              'Ít nhất 6 ký tự',
              {
                secureTextEntry: !showPassword,
                rightElement: (
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                ),
              },
            )}

            <View style={styles.fieldGap} />

            {renderInput(
              'Nhập lại mật khẩu *',
              confirmPassword,
              setConfirmPassword,
              'lock-closed-outline',
              'Nhập lại mật khẩu',
              {
                secureTextEntry: !showConfirm,
                rightElement: (
                  <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                ),
              },
            )}

            {/* Password match indicator */}
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorText}>Mật khẩu không khớp</Text>
            )}
            {confirmPassword.length > 0 && password === confirmPassword && (
              <Text style={styles.successText}>Mật khẩu khớp ✓</Text>
            )}

            {/* ─── Role info ──────────────────── */}
            <View style={styles.roleInfo}>
              <Ionicons name="restaurant-outline" size={16} color={Colors.secondary} />
              <Text style={styles.roleInfoText}>
                Đăng ký với tư cách <Text style={styles.roleInfoHighlight}>Nhà hàng</Text>
              </Text>
            </View>

            {/* ─── Terms ──────────────────────── */}
            <Pressable style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
              <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                {agreeTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                Tôi đồng ý với{' '}
                <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
                <Text style={styles.termsLink}>Chính sách bảo mật</Text>
              </Text>
            </Pressable>

            {/* ─── Register button ────────────── */}
            <Button
              title="ĐĂNG KÝ NHÀ HÀNG"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleRegister}
              disabled={!isFormValid}
              style={styles.registerButton}
            />

            {/* ─── Divider ────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ─── Login link ─────────────────── */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <Pressable onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default RegisterScreen;

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
    marginTop: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  brandDeco: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  brandSub: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ─── Form ────────────────────────────────
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

  // ─── Section divider ─────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  sectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },

  // ─── Inputs ──────────────────────────────
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
  fieldGap: {
    height: 14,
  },

  // ─── Helper text ─────────────────────────
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },

  // ─── Tax badge ───────────────────────────
  taxBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ─── Status indicators ───────────────────
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
    fontWeight: '500',
  },
  successText: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 6,
    fontWeight: '500',
  },

  // ─── Role info ─────────────────────────
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
  },
  roleInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  roleInfoHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },

  // ─── Checkbox ────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  termsLink: {
    fontWeight: '700',
    color: Colors.secondary,
  },

  // ─── Button ──────────────────────────────
  registerButton: {
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

  // ─── Login link ──────────────────────────
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },

  bottomSpacer: {
    height: 40,
  },
});
