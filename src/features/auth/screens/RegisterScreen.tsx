import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Colors } from '../../../constants/colors';
import { theme } from '../../../config/theme';
import { Button } from '../../../components/ui/Button';
import { Logo } from '../../../components/ui/Logo';
import { authApi } from '../api/authApi';
import { fetchTaxInfo } from '../../../services/taxLookup';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

// Password must match backend: min 8 chars, 1 uppercase, 1 digit, 1 special char
function isPasswordStrong(pw: string): boolean {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
}

export function RegisterScreen({ navigation }: { navigation: any }) {
  const [isLoading, setIsLoading] = useState(false);

  // ─── Restaurant info ─────────────────────
  const [restaurantName, setRestaurantName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [invoiceLegalName, setInvoiceLegalName] = useState('');
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);
  const [taxVerified, setTaxVerified] = useState(false);
  const [taxLookupError, setTaxLookupError] = useState('');

  // ─── Tax lookup ──────────────────────────
  // Guards against a slow/stale lookup response landing after the user has already
  // changed the MST again — without this it could silently overwrite Address with
  // data for a tax code that's no longer in the field.
  const taxCodeRequestRef = useRef('');

  // Only auto-fills the address — restaurantName is typed upfront (first field on
  // the form now) before the user ever reaches this section, so overwriting it
  // here would clobber what they already entered. The lookup result's `name` is
  // the business's legal name (tên pháp lý) — captured into `invoiceLegalName` and
  // sent to BE alongside `invoiceAddress` (RegisterRestaurantCommand.InvoiceLegalName
  // / .InvoiceAddress, added 14/08/2026), not just shown as a hint.
  const handleTaxCodeChange = async (code: string) => {
    setTaxCode(code);
    setTaxVerified(false);
    setTaxLookupError('');
    setInvoiceLegalName('');
    taxCodeRequestRef.current = code;
    // MST cá nhân: 10 số, MST chi nhánh: 13 số
    if (code.length === 10 || code.length === 13) {
      setTaxLookupLoading(true);
      const info = await fetchTaxInfo(code);
      setTaxLookupLoading(false);
      if (taxCodeRequestRef.current !== code) return; // superseded by a newer edit — discard
      if (info) {
        setRestaurantAddress(info.address);
        setInvoiceLegalName(info.name);
        setTaxVerified(true);
      } else {
        setTaxLookupError('Không tìm thấy thông tin doanh nghiệp với mã số thuế này.');
      }
    }
  };

  // ─── Security ────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Agreement ───────────────────────────
  const [agreeTerms, setAgreeTerms] = useState(false);

  // ─── Validation ──────────────────────────
  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  const isFormValid =
    phone.trim().length >= 10 &&
    email.includes('@') &&
    restaurantName.trim().length > 0 &&
    restaurantAddress.trim().length > 0 &&
    taxCode.trim().length > 0 &&
    !taxLookupLoading &&
    Object.values(passwordChecks).every(Boolean) &&
    password === confirmPassword &&
    agreeTerms;

  const handleRegister = async () => {
    if (!isFormValid) return;
    setIsLoading(true);
    // BE's phone regex (^\+?[0-9]{7,15}$) rejects spaces — the placeholder shows
    // "090 123 45 67" so users naturally type spaces; strip them, not just trim.
    const normalizedPhone = phone.replace(/\s+/g, '');
    try {
      await authApi.register(
        email.trim(),
        password,
        restaurantName.trim(),
        normalizedPhone,
        taxCode.trim(),
        restaurantAddress.trim(),
        invoiceLegalName.trim(),
      );
      navigation.navigate('VerifyEmail' as never, { email: email.trim() } as never);
    } catch (err: any) {
      const code: string = err?.response?.data?.code ?? '';

      let title = 'Đăng ký thất bại';
      let body = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

      if (code === 'EMAIL_ALREADY_EXISTS') {
        title = 'Email đã được sử dụng';
        body = `Địa chỉ email "${email.trim()}" đã có tài khoản.\nVui lòng dùng email khác hoặc đăng nhập.`;
      } else if (code === 'PHONE_ALREADY_EXISTS') {
        title = 'Số điện thoại đã được sử dụng';
        body = `Số điện thoại "${normalizedPhone}" đã được đăng ký.\nVui lòng dùng số điện thoại khác.`;
      } else if (code === 'ROLE_NOT_CONFIGURED') {
        title = 'Chưa thể đăng ký';
        body = 'Đăng ký tài khoản nhà hàng hiện tạm gián đoạn. Vui lòng liên hệ hỗ trợ.';
      } else if (!err?.response) {
        title = 'Không có kết nối mạng';
        body = 'Vui lòng kiểm tra kết nối internet và thử lại.';
      } else {
        body = getApiErrorMessage(err, body);
      }

      Alert.alert(title, body, [{ text: 'Đã hiểu' }]);
    } finally {
      setIsLoading(false);
    }
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
            <Logo width={140} dark />
            <Text style={styles.brandTitle}>Đăng ký tài khoản Nhà hàng</Text>
            <Text style={styles.brandSub}>
              Trở thành đối tác đặt hàng thực phẩm tươi sống mỗi ngày
            </Text>
          </View>

          {/* ─── Form Card ────────────────────── */}
          <View style={styles.formCard}>
            {/* ═══ SECTION: THÔNG TIN NHÀ HÀNG ═══ */}
            <View style={styles.sectionRow}>
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

            {/* ═══ SECTION: THÔNG TIN THUẾ ═══ */}
            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionText}>THÔNG TIN THUẾ</Text>
              <View style={styles.sectionLine} />
            </View>

            {/* ─── Mã số thuế ─────────────────── */}
            <Text style={styles.label}>Mã số thuế *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={taxCode}
                onChangeText={handleTaxCodeChange}
                placeholder="0123456789"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={14}
              />
              {taxLookupLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : taxVerified ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              ) : (
                <View style={styles.taxBadge}>
                  <Text style={styles.taxBadgeText}>MST</Text>
                </View>
              )}
            </View>
            {taxLookupError ? (
              <Text style={styles.errorText}>{taxLookupError}</Text>
            ) : taxVerified ? (
              <Text style={styles.successText}>Đã xác thực thông tin doanh nghiệp (tên pháp lý) ✓</Text>
            ) : (
              <Text style={styles.helperText}>
                Nhập mã số thuế để tự động điền địa chỉ nhà hàng
              </Text>
            )}

            <View style={styles.fieldGap} />

            {renderInput(
              'Địa chỉ nhà hàng *',
              restaurantAddress,
              setRestaurantAddress,
              'location-outline',
              'Tự động điền từ mã số thuế',
              { autoCapitalize: 'sentences' },
            )}

            <View style={styles.fieldGap} />

            {renderInput(
              'Tên pháp lý doanh nghiệp',
              invoiceLegalName,
              setInvoiceLegalName,
              'business-outline',
              'Tự động điền từ mã số thuế',
              { autoCapitalize: 'words' },
            )}

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
              'Ít nhất 8 ký tự, 1 hoa, 1 số, 1 ký tự đặc biệt',
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

            {/* Password strength checklist */}
            {password.length > 0 && (
              <View style={styles.passwordChecks}>
                {[
                  { ok: passwordChecks.length, label: 'Ít nhất 8 ký tự' },
                  { ok: passwordChecks.upper,  label: '1 chữ hoa (A-Z)' },
                  { ok: passwordChecks.digit,  label: '1 chữ số (0-9)' },
                  { ok: passwordChecks.special, label: '1 ký tự đặc biệt (!@#...)' },
                ].map(({ ok, label }) => (
                  <View key={label} style={styles.checkRow}>
                    <Ionicons
                      name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={ok ? Colors.success : Colors.textMuted}
                    />
                    <Text style={[styles.checkLabel, ok && styles.checkLabelOk]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
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
              title={isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ NHÀ HÀNG'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
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
    backgroundColor: Colors.deepTeal,
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
  brandTitle: {
    marginTop: 14,
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

  // ─── Password checklist ──────────────────
  passwordChecks: {
    marginTop: 8,
    gap: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkLabelOk: {
    color: Colors.success,
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
