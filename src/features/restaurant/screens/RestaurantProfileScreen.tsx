import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';
import { Colors } from '../../../constants/colors';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import { BrandButton as Button } from '../../../components/ui/BrandButton';
import { uploadImageToCloudinary } from '../../../services/cloudinaryUpload';
import { fetchTaxInfo } from '../../../services/taxLookup';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import { useAuthStore } from '../../../store/authStore';
import {
  restaurantApi,
  type RestaurantProfileDto,
  type ApprovalStatusDto,
} from '../api/restaurantApi';

type Nav = NativeStackNavigationProp<RestaurantProfileStackParamList>;

// ─── Constants ──────────────────────────────────────────────────────────────────

const APPROVAL_STATUS_LABEL: Record<ApprovalStatusDto['status'], string> = {
  pending: 'Chờ duyệt',
  active: 'Hoạt động',
  suspended: 'Tạm ngừng',
};

const APPROVAL_STATUS_COLOR: Record<ApprovalStatusDto['status'], string> = {
  pending: '#F59E0B',
  active: '#22C55E',
  suspended: '#EF4444',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

// Mirrors UpdateMyTaxProfileCommandValidator.cs exactly (10-digit MST, optional -3-digit branch suffix).
const TAX_CODE_REGEX = /^\d{10}(-\d{3})?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateTaxCode(v: string): string | null {
  if (!v) return 'Bắt buộc nhập';
  return TAX_CODE_REGEX.test(v) ? null : 'MST gồm 10 chữ số (có thể thêm -XXX cho chi nhánh)';
}

function validateTaxEmail(v: string): string | null {
  if (!v) return null;
  return EMAIL_REGEX.test(v) ? null : 'Email không hợp lệ';
}

function formatUpdatedAt(value: string): string {
  if (!value) return 'Chưa có thông tin';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
  hint,
  rightElement,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  error?: string | null;
  hint?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={field.container}>
      <Text style={field.label}>{label}</Text>
      <View style={[field.inputWrapper, error ? field.inputError : null]}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <TextInput
          style={field.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {rightElement}
      </View>
      {error ? (
        <Text style={field.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={field.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const field = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 2 },
  hintText: { fontSize: 12, color: Colors.textMuted, marginTop: 4, marginLeft: 2 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────────

/**
 * `pickupStart`/`pickupEnd` are carried in this form purely to round-trip
 * unchanged on save — the receiving-window feature is retired (every
 * delivery, one-off or recurring, now uses the same fixed early-morning
 * window; see `CreateOrderScreen.tsx`'s `DELIVERY_HOUR`), so this screen no
 * longer renders any UI for them. Dropping them from the update payload
 * instead would silently null out whatever a restaurant configured before,
 * since the backend overwrites both fields unconditionally on every save.
 */
type RestaurantProfileForm = Pick<
  RestaurantProfileDto,
  'name' | 'address' | 'contactPerson' | 'pickupStart' | 'pickupEnd'
>;

const EMPTY_FORM: RestaurantProfileForm = {
  name: '',
  address: '',
  contactPerson: '',
  pickupStart: '',
  pickupEnd: '',
};

function toForm(profile: RestaurantProfileDto): RestaurantProfileForm {
  return {
    name: profile.name,
    address: profile.address,
    contactPerson: profile.contactPerson,
    pickupStart: profile.pickupStart,
    pickupEnd: profile.pickupEnd,
  };
}

type TaxProfileForm = {
  taxCode: string;
  legalName: string;
  invoiceAddress: string;
  invoiceEmail: string;
};

const EMPTY_TAX_FORM: TaxProfileForm = {
  taxCode: '',
  legalName: '',
  invoiceAddress: '',
  invoiceEmail: '',
};

/**
 * `invoiceEmail` is never seeded on the backend — it stays `null` until the
 * restaurant explicitly saves a tax profile (`UpdateMyTaxProfileCommandHandler`
 * is the only writer). Defaulting the form to the account's login email here
 * is FE-only and still editable/overridable before save; nothing is persisted
 * until the restaurant actually submits the tax profile form.
 */
function toTaxForm(profile: RestaurantProfileDto, loginEmail: string): TaxProfileForm {
  return {
    taxCode: profile.taxCode,
    legalName: profile.invoiceLegalName,
    invoiceAddress: profile.invoiceAddress,
    invoiceEmail: profile.invoiceEmail || loginEmail,
  };
}

export function RestaurantProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [form, setForm] = useState<RestaurantProfileForm>(EMPTY_FORM);
  const [original, setOriginal] = useState<RestaurantProfileForm>(EMPTY_FORM);
  const [profile, setProfile] = useState<RestaurantProfileDto | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatusDto['status'] | null>(null);

  // ─── Tax profile ────────────────────────────────────────────────────────
  const [taxForm, setTaxForm] = useState<TaxProfileForm>(EMPTY_TAX_FORM);
  const [taxOriginal, setTaxOriginal] = useState<TaxProfileForm>(EMPTY_TAX_FORM);
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [taxSaveLoading, setTaxSaveLoading] = useState(false);
  const [taxSaveError, setTaxSaveError] = useState<string | null>(null);
  const [taxSavedOk, setTaxSavedOk] = useState(false);
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);
  const [taxVerified, setTaxVerified] = useState(false);
  const [taxLookupError, setTaxLookupError] = useState('');

  // ─── Business license ───────────────────────────────────────────────────
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licensePreviewVisible, setLicensePreviewVisible] = useState(false);
  const [licensePreviewFailed, setLicensePreviewFailed] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profileData, statusData] = await Promise.all([
        restaurantApi.getRestaurantProfile(),
        restaurantApi.getApprovalStatus().catch(() => null),
      ]);
      const nextForm = toForm(profileData);
      const nextTaxForm = toTaxForm(profileData, user?.email ?? '');
      setProfile(profileData);
      setForm(nextForm);
      setOriginal(nextForm);
      setTaxForm(nextTaxForm);
      setTaxOriginal(nextTaxForm);
      setApprovalStatus(statusData?.status ?? profileData.status);
    } catch (error) {
      setLoadError(
        getApiErrorMessage(error, 'Không thể tải thông tin nhà hàng. Vui lòng thử lại.'),
      );
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const setField = useCallback(<K extends keyof RestaurantProfileForm>(
    key: K,
    value: RestaurantProfileForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveError(null);
    setSavedOk(false);
  }, []);

  const enterEdit = useCallback(() => {
    setIsEditing(true);
    setSaveError(null);
    setSavedOk(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setForm(original);
    setIsEditing(false);
    setSaveError(null);
  }, [original]);

  const canSave = !saveLoading && !!form.name.trim();

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaveLoading(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const updated = await restaurantApi.updateRestaurantProfile({
        name: form.name.trim(),
        address: form.address.trim() || null,
        contactPerson: form.contactPerson.trim() || null,
        pickupStart: form.pickupStart || null,
        pickupEnd: form.pickupEnd || null,
        businessLicenseUrl: profile?.businessLicenseUrl ?? null,
      });
      const nextForm = toForm(updated);
      // UpdateRestaurantProfileResponse (unlike GetRestaurantProfileResponse) doesn't carry
      // status or the tax-profile fields, so `updated` has them defaulted to null/'' —
      // preserve whatever was already loaded instead of blanking them out.
      setProfile((previous) => ({
        ...updated,
        status: previous?.status ?? approvalStatus,
        businessLicenseUrl:
          updated.businessLicenseUrl ?? previous?.businessLicenseUrl ?? null,
        taxCode: previous?.taxCode ?? '',
        invoiceLegalName: previous?.invoiceLegalName ?? '',
        invoiceAddress: previous?.invoiceAddress ?? '',
        invoiceEmail: previous?.invoiceEmail ?? '',
      }));
      setForm(nextForm);
      setOriginal(nextForm);
      setIsEditing(false);
      setSavedOk(true);
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err, 'Cập nhật thất bại. Vui lòng thử lại.'));
    } finally {
      setSaveLoading(false);
    }
  }, [approvalStatus, canSave, form, profile?.businessLicenseUrl]);

  // ─── Tax profile handlers ───────────────────────────────────────────────

  // Mirrors InvoiceIssuanceService.IsBuyerComplete (BE) — email is optional there too.
  const isTaxProfileComplete =
    !!profile?.taxCode && !!profile?.invoiceLegalName && !!profile?.invoiceAddress;

  const taxCodeError = isEditingTax ? validateTaxCode(taxForm.taxCode) : null;
  const taxEmailError = isEditingTax ? validateTaxEmail(taxForm.invoiceEmail) : null;
  const canSaveTax =
    !taxSaveLoading &&
    !taxLookupLoading &&
    !validateTaxCode(taxForm.taxCode) &&
    !!taxForm.legalName.trim() &&
    !!taxForm.invoiceAddress.trim() &&
    !validateTaxEmail(taxForm.invoiceEmail);

  const setTaxField = useCallback(<K extends keyof TaxProfileForm>(
    key: K,
    value: TaxProfileForm[K],
  ) => {
    setTaxForm((prev) => ({ ...prev, [key]: value }));
    setTaxSaveError(null);
    setTaxSavedOk(false);
  }, []);

  // Guards against a race where the user keeps editing the MST after a lookup request
  // is already in flight — without this, a slow/stale response could land after a newer
  // edit and silently overwrite legalName/address for a tax code that's no longer current.
  const taxCodeRequestRef = useRef('');

  // Mirrors RegisterScreen.tsx's lookup: auto-fills legal name + address from a public
  // business registry once a full 10-digit MST is entered. Best-effort only — a failed
  // or unmatched lookup never blocks manual entry, it just skips the auto-fill.
  const handleTaxCodeChange = useCallback(async (raw: string) => {
    const code = raw.replace(/[^0-9-]/g, '');
    setTaxField('taxCode', code);
    setTaxVerified(false);
    setTaxLookupError('');
    taxCodeRequestRef.current = code;
    if (code.length === 10) {
      setTaxLookupLoading(true);
      const info = await fetchTaxInfo(code);
      setTaxLookupLoading(false);
      if (taxCodeRequestRef.current !== code) return; // superseded by a newer edit — discard
      if (info) {
        setTaxForm((prev) => ({ ...prev, legalName: info.name, invoiceAddress: info.address }));
        setTaxVerified(true);
      } else {
        setTaxLookupError('Không tìm thấy thông tin doanh nghiệp với mã số thuế này.');
      }
    }
  }, [setTaxField]);

  const enterEditTax = useCallback(() => {
    setIsEditingTax(true);
    setTaxSaveError(null);
    setTaxSavedOk(false);
    setTaxVerified(false);
    setTaxLookupError('');
  }, []);

  const cancelEditTax = useCallback(() => {
    setTaxForm(taxOriginal);
    setIsEditingTax(false);
    setTaxSaveError(null);
    setTaxVerified(false);
    setTaxLookupError('');
  }, [taxOriginal]);

  const handleSaveTax = useCallback(async () => {
    if (!canSaveTax) return;
    setTaxSaveLoading(true);
    setTaxSaveError(null);
    setTaxSavedOk(false);
    try {
      const updated = await restaurantApi.updateTaxProfile({
        taxCode: taxForm.taxCode.trim(),
        legalName: taxForm.legalName.trim(),
        address: taxForm.invoiceAddress.trim() || null,
        email: taxForm.invoiceEmail.trim() || null,
      });
      const nextTaxForm: TaxProfileForm = {
        taxCode: updated.taxCode,
        legalName: updated.legalName,
        invoiceAddress: updated.address,
        invoiceEmail: updated.email,
      };
      setProfile((previous) =>
        previous
          ? {
              ...previous,
              taxCode: updated.taxCode,
              invoiceLegalName: updated.legalName,
              invoiceAddress: updated.address,
              invoiceEmail: updated.email,
            }
          : previous,
      );
      setTaxForm(nextTaxForm);
      setTaxOriginal(nextTaxForm);
      setIsEditingTax(false);
      setTaxSavedOk(true);
    } catch (err: unknown) {
      setTaxSaveError(getApiErrorMessage(err, 'Cập nhật hồ sơ thuế thất bại. Vui lòng thử lại.'));
    } finally {
      setTaxSaveLoading(false);
    }
  }, [canSaveTax, taxForm]);

  // ─── Business license handler ───────────────────────────────────────────

  const handleUploadLicense = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh trong Cài đặt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setLicenseUploading(true);
    setLicenseError(null);
    try {
      const signature = await restaurantApi.getLicenseUploadSignature();
      const url = await uploadImageToCloudinary(result.assets[0].uri, signature);
      const updated = await restaurantApi.updateRestaurantProfile({
        name: profile?.name ?? '',
        address: profile?.address || null,
        contactPerson: profile?.contactPerson || null,
        pickupStart: profile?.pickupStart || null,
        pickupEnd: profile?.pickupEnd || null,
        businessLicenseUrl: url,
      });
      setProfile((previous) =>
        previous ? { ...previous, businessLicenseUrl: updated.businessLicenseUrl } : previous,
      );
    } catch (err: unknown) {
      setLicenseError(getApiErrorMessage(err, 'Tải giấy phép lên thất bại. Vui lòng thử lại.'));
    } finally {
      setLicenseUploading(false);
    }
  }, [profile]);

  const handleViewLicense = useCallback(() => {
    if (profile?.businessLicenseUrl) {
      setLicensePreviewFailed(false);
      setLicensePreviewVisible(true);
    }
  }, [profile?.businessLicenseUrl]);

  if (loading) {
    return (
      <View style={[styles.center, styles.loadingScreen]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin nhà hàng...</Text>
      </View>
    );
  }

  if (loadError && !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.outline} />
          <Text style={styles.loadErrorText}>{loadError}</Text>
          <Button
            title="THỬ LẠI"
            variant="primary"
            size="md"
            icon={<Ionicons name="refresh" size={18} color={Colors.onPrimary} />}
            onPress={loadProfile}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Header ─────────────────────────── */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Thông tin nhà hàng</Text>
              <Text style={styles.pageSub}>Cập nhật tên và địa chỉ</Text>
            </View>
            {!isEditing && (
              <Pressable style={styles.editBtn} onPress={enterEdit}>
                <Ionicons name="pencil" size={14} color={Colors.primaryText} />
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </Pressable>
            )}
          </View>

          {/* ─── Success banner ─────────────────── */}
          {savedOk && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primaryText} />
              <Text style={styles.successText}>Thông tin nhà hàng đã được cập nhật.</Text>
            </View>
          )}

          {/* ─── Error banner ───────────────────── */}
          {loadError && profile && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
              <Text style={styles.errorBannerText}>{loadError}</Text>
            </View>
          )}

          {saveError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.errorBannerText}>{saveError}</Text>
            </View>
          )}

          {/* ─── Approval status card ───────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSection}>Trạng thái tài khoản</Text>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.textMuted} />
              {approvalStatus ? (
                <View
                  style={[
                    styles.approvalBadge,
                    { backgroundColor: APPROVAL_STATUS_COLOR[approvalStatus] + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.approvalBadgeText,
                      { color: APPROVAL_STATUS_COLOR[approvalStatus] },
                    ]}
                  >
                    {APPROVAL_STATUS_LABEL[approvalStatus]}
                  </Text>
                </View>
              ) : (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              )}
            </View>
            <View style={styles.separator} />
            <InfoView
              icon="sync-outline"
              label="Cập nhật gần nhất"
              value={formatUpdatedAt(profile?.updatedAt ?? '')}
            />
          </View>

          {/* ─── Form card ──────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSection}>Thông tin cơ bản</Text>

            {isEditing ? (
              <>
                <FormField
                  label="Tên nhà hàng"
                  icon="storefront-outline"
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  placeholder="Nhập tên nhà hàng"
                  autoCapitalize="words"
                />
                <FormField
                  label="Địa chỉ"
                  icon="location-outline"
                  value={form.address}
                  onChangeText={(v) => setField('address', v)}
                  placeholder="Số nhà, đường, phường, quận..."
                />
                <FormField
                  label="Người liên hệ"
                  icon="person-outline"
                  value={form.contactPerson}
                  onChangeText={(v) => setField('contactPerson', v)}
                  placeholder="Họ tên người liên hệ"
                  autoCapitalize="words"
                />
              </>
            ) : (
              <>
                <InfoView icon="storefront-outline" label="Tên nhà hàng" value={form.name || '—'} />
                <View style={styles.separator} />
                <InfoView icon="location-outline" label="Địa chỉ" value={form.address || '—'} />
                <View style={styles.separator} />
                <InfoView
                  icon="person-outline"
                  label="Người liên hệ"
                  value={form.contactPerson || '—'}
                />
              </>
            )}
          </View>

          {/* ─── Delivery addresses card ────────── */}
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('DeliveryAddresses')}
          >
            <View style={styles.navRow}>
              <View style={styles.navRowLeft}>
                <View style={styles.navIcon}>
                  <Ionicons name="location-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ gap: 1 }}>
                  <Text style={styles.navRowTitle}>Địa chỉ giao hàng</Text>
                  <Text style={styles.navRowSub}>Quản lý địa chỉ và toạ độ GPS</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </Pressable>

          {/* ─── Invoices card ───────────────────── */}
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Invoices')}
          >
            <View style={styles.navRow}>
              <View style={styles.navRowLeft}>
                <View style={styles.navIcon}>
                  <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ gap: 1 }}>
                  <Text style={styles.navRowTitle}>Hóa đơn VAT</Text>
                  <Text style={styles.navRowSub}>Xem hóa đơn điện tử đã phát hành</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </Pressable>

          {/* ─── Business license card ───────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSection}>Hồ sơ pháp lý</Text>
            <Pressable
              style={styles.licenseRow}
              onPress={profile?.businessLicenseUrl ? handleViewLicense : undefined}
              disabled={!profile?.businessLicenseUrl}
            >
              {profile?.businessLicenseUrl ? (
                <Image source={{ uri: profile.businessLicenseUrl }} style={styles.licenseThumb} />
              ) : (
                <View style={[styles.licenseThumb, styles.licenseThumbEmpty]}>
                  <Ionicons name="document-text-outline" size={22} color={Colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.licenseRowLabel}>Giấy phép kinh doanh</Text>
                <Text
                  style={[
                    styles.licenseRowStatus,
                    { color: profile?.businessLicenseUrl ? Colors.success : Colors.warning },
                  ]}
                >
                  {profile?.businessLicenseUrl ? 'Đã cập nhật · Chạm để xem' : 'Chưa cập nhật'}
                </Text>
              </View>
            </Pressable>
            {licenseError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{licenseError}</Text>
              </View>
            )}
            <Pressable
              style={[styles.licenseBtn, styles.licenseBtnFull]}
              onPress={handleUploadLicense}
              disabled={licenseUploading}
            >
              {licenseUploading ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color={Colors.onPrimary} />
                  <Text style={styles.licenseBtnPrimaryText}>
                    {profile?.businessLicenseUrl ? 'Cập nhật ảnh' : 'Tải ảnh lên'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* ─── Tax profile card ────────────────── */}
          <View style={styles.card}>
            <View style={styles.taxHeaderRow}>
              <Text style={[styles.cardSection, styles.taxHeaderTitle]}>Hồ sơ thuế</Text>
              {!isEditingTax && (
                <Pressable style={styles.taxEditIconBtn} onPress={enterEditTax} hitSlop={8}>
                  <Ionicons name="pencil" size={16} color={Colors.primaryText} />
                </Pressable>
              )}
            </View>
            <View style={styles.taxStatusRow}>
              <Ionicons
                name={isTaxProfileComplete ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={isTaxProfileComplete ? Colors.success : Colors.warning}
              />
              <Text
                style={[
                  styles.taxStatusText,
                  { color: isTaxProfileComplete ? Colors.success : Colors.warning },
                ]}
              >
                {isTaxProfileComplete
                  ? 'Đã thiết lập'
                  : 'Chưa thiết lập — bắt buộc để xuất hóa đơn VAT'}
              </Text>
            </View>

            {taxSavedOk && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primaryText} />
                <Text style={styles.successText}>Hồ sơ thuế đã được cập nhật.</Text>
              </View>
            )}
            {taxSaveError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{taxSaveError}</Text>
              </View>
            )}

            {isEditingTax ? (
              <>
                <FormField
                  label="Mã số thuế (MST)"
                  icon="card-outline"
                  value={taxForm.taxCode}
                  onChangeText={handleTaxCodeChange}
                  placeholder="0123456789"
                  keyboardType="numeric"
                  error={taxCodeError}
                  rightElement={
                    taxLookupLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : taxVerified ? (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    ) : null
                  }
                />
                {!taxCodeError && (taxLookupError || taxVerified) && (
                  <Text
                    style={[
                      styles.taxLookupHint,
                      { color: taxVerified ? Colors.success : Colors.textMuted },
                    ]}
                  >
                    {taxVerified ? 'Đã xác thực thông tin doanh nghiệp ✓' : taxLookupError}
                  </Text>
                )}
                <FormField
                  label="Tên pháp lý"
                  icon="business-outline"
                  value={taxForm.legalName}
                  onChangeText={(v) => setTaxField('legalName', v)}
                  placeholder="Tên công ty/hộ kinh doanh trên hóa đơn"
                  autoCapitalize="words"
                />
                <FormField
                  label="Địa chỉ hóa đơn"
                  icon="location-outline"
                  value={taxForm.invoiceAddress}
                  onChangeText={(v) => setTaxField('invoiceAddress', v)}
                  placeholder="Địa chỉ đăng ký kinh doanh"
                />
                <FormField
                  label="Email nhận hóa đơn"
                  icon="mail-outline"
                  value={taxForm.invoiceEmail}
                  onChangeText={(v) => setTaxField('invoiceEmail', v)}
                  placeholder="ketoan@nhahang.com (không bắt buộc)"
                  keyboardType="default"
                  autoCapitalize="none"
                  error={taxEmailError}
                />
                <View style={styles.actionRow}>
                  <Button
                    title="Huỷ"
                    variant="secondary"
                    size="md"
                    onPress={cancelEditTax}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="LƯU"
                    variant="primary"
                    size="md"
                    loading={taxSaveLoading}
                    onPress={handleSaveTax}
                    disabled={!canSaveTax}
                    style={styles.actionBtn}
                  />
                </View>
              </>
            ) : (
              <>
                <InfoView icon="card-outline" label="Mã số thuế" value={taxForm.taxCode || '—'} />
                <View style={styles.separator} />
                <InfoView icon="business-outline" label="Tên pháp lý" value={taxForm.legalName || '—'} />
                <View style={styles.separator} />
                <InfoView icon="location-outline" label="Địa chỉ hóa đơn" value={taxForm.invoiceAddress || '—'} />
                <View style={styles.separator} />
                <InfoView icon="mail-outline" label="Email nhận hóa đơn" value={taxForm.invoiceEmail || '—'} />
              </>
            )}
          </View>

          {isEditing && (
            <View style={styles.actionRow}>
              <Button
                title="Huỷ"
                variant="secondary"
                size="md"
                onPress={cancelEdit}
                style={styles.actionBtn}
              />
              <Button
                title="LƯU THAY ĐỔI"
                variant="primary"
                size="md"
                loading={saveLoading}
                onPress={handleSave}
                disabled={!canSave}
                style={styles.actionBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Business license preview modal ──── */}
      <Modal
        visible={licensePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLicensePreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <Pressable
            style={styles.previewCloseBtn}
            onPress={() => setLicensePreviewVisible(false)}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          {profile?.businessLicenseUrl && !licensePreviewFailed ? (
            <Image
              source={{ uri: profile.businessLicenseUrl }}
              style={styles.previewImage}
              resizeMode="contain"
              onError={() => setLicensePreviewFailed(true)}
            />
          ) : (
            <View style={styles.previewErrorBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#FFFFFF" />
              <Text style={styles.previewErrorText}>Không thể hiển thị ảnh giấy phép.</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoView({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={info.row}>
      <View style={info.left}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <Text style={info.label}>{label}</Text>
      </View>
      <Text style={[info.value, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const info = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 8,
  },
  // `flexShrink: 0` keeps the icon+label from being compressed by a long value
  // sharing the row — without it, a short-but-wide value (e.g. an email with no
  // wrap points) could push `left` and `value` past the card's right edge
  // instead of `value` wrapping within its own space.
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  label: { fontSize: 14, color: Colors.textSecondary },
  // `flex: 1` (not a fixed `maxWidth: '55%'`) so the value always wraps inside
  // whatever space is actually left after the label, rather than being allowed
  // to claim up to 55% of the row regardless of how wide the label already is.
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingScreen: { backgroundColor: Colors.background, gap: 10 },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  loadErrorText: {
    maxWidth: 300,
    marginTop: 12,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.error,
  },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  // ─── Header ──────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  pageSub: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primaryText },

  // ─── Banners ─────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successText: { flex: 1, fontSize: 13, color: Colors.primaryText },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#EF4444' },

  // ─── Card ────────────────────────────────────
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardSection: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: 14,
    paddingBottom: 12,
  },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  // ─── Actions ─────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: { flex: 1, borderRadius: 12 },

  // ─── Approval status ─────────────────────────
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
  },
  approvalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  approvalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Delivery addresses nav row ──────────
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight ?? '#f0faf4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  navRowTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  navRowSub: { fontSize: 12, color: Colors.textMuted },

  // ─── Business license ─────────────────────────
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  licenseThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
  },
  licenseThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
  },
  licenseRowLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  licenseRowStatus: { fontSize: 12, fontWeight: '600' },
  licenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  licenseBtnFull: { backgroundColor: Colors.primary },
  licenseBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: Colors.onPrimary },

  // ─── Tax profile ───────────────────────────────
  taxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  taxHeaderTitle: { flex: 1, paddingBottom: 0 },
  taxEditIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  taxStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  taxStatusText: { fontSize: 12, fontWeight: '600', flex: 1 },
  taxLookupHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 2,
  },

  // ─── Business license preview modal ───────────
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewImage: { width: '100%', height: '80%' },
  previewErrorBox: { alignItems: 'center', gap: 10, paddingHorizontal: 32 },
  previewErrorText: { fontSize: 14, color: '#FFFFFF', textAlign: 'center' },
});
