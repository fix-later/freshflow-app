import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Button } from '../../../components/ui/Button';
import { restaurantApi, type RestaurantProfileDto } from '../api/restaurantApi';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateTime(t: string): string | null {
  if (!t) return null;
  return TIME_REGEX.test(t) ? null : 'Định dạng HH:MM (ví dụ 08:00)';
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + ':' + digits.slice(2);
  return digits;
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

const EMPTY_FORM: RestaurantProfileDto = {
  name: '',
  address: '',
  contactPerson: '',
  pickupStart: '',
  pickupEnd: '',
};

export function RestaurantProfileScreen() {
  const [form, setForm] = useState<RestaurantProfileDto>(EMPTY_FORM);
  const [original, setOriginal] = useState<RestaurantProfileDto>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    restaurantApi
      .getRestaurantProfile()
      .then((data) => {
        setForm(data);
        setOriginal(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setField = useCallback(<K extends keyof RestaurantProfileDto>(
    key: K,
    value: RestaurantProfileDto[K],
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

  const pickupStartError = validateTime(form.pickupStart);
  const pickupEndError = validateTime(form.pickupEnd);
  const canSave =
    !saveLoading &&
    !!form.name.trim() &&
    !!form.address.trim() &&
    !pickupStartError &&
    !pickupEndError;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaveLoading(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const updated = await restaurantApi.updateRestaurantProfile({
        name: form.name.trim(),
        address: form.address.trim(),
        contactPerson: form.contactPerson.trim(),
        pickupStart: form.pickupStart,
        pickupEnd: form.pickupEnd,
      });
      setForm(updated);
      setOriginal(updated);
      setIsEditing(false);
      setSavedOk(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cập nhật thất bại. Vui lòng thử lại.';
      setSaveError(msg);
    } finally {
      setSaveLoading(false);
    }
  }, [canSave, form]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
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
              <Text style={styles.pageSub}>Cập nhật tên, địa chỉ và giờ nhận hàng</Text>
            </View>
            {!isEditing && (
              <Pressable style={styles.editBtn} onPress={enterEdit}>
                <Ionicons name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </Pressable>
            )}
          </View>

          {/* ─── Success banner ─────────────────── */}
          {savedOk && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              <Text style={styles.successText}>Thông tin nhà hàng đã được cập nhật.</Text>
            </View>
          )}

          {/* ─── Error banner ───────────────────── */}
          {saveError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.errorBannerText}>{saveError}</Text>
            </View>
          )}

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

          {/* ─── Pickup time card ───────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSection}>Khung giờ nhận hàng</Text>

            {isEditing ? (
              <View style={styles.timeRow}>
                <View style={styles.timeHalf}>
                  <FormField
                    label="Từ"
                    icon="time-outline"
                    value={form.pickupStart}
                    onChangeText={(v) => setField('pickupStart', formatTimeInput(v))}
                    placeholder="08:00"
                    keyboardType="numeric"
                    autoCapitalize="none"
                    error={pickupStartError}
                    hint="HH:MM"
                  />
                </View>
                <View style={styles.timeDivider}>
                  <Text style={styles.timeDash}>–</Text>
                </View>
                <View style={styles.timeHalf}>
                  <FormField
                    label="Đến"
                    icon="time-outline"
                    value={form.pickupEnd}
                    onChangeText={(v) => setField('pickupEnd', formatTimeInput(v))}
                    placeholder="17:00"
                    keyboardType="numeric"
                    autoCapitalize="none"
                    error={pickupEndError}
                    hint="HH:MM"
                  />
                </View>
              </View>
            ) : (
              <InfoView
                icon="time-outline"
                label="Giờ nhận hàng"
                value={
                  form.pickupStart && form.pickupEnd
                    ? `${form.pickupStart} – ${form.pickupEnd}`
                    : '—'
                }
              />
            )}
          </View>

          {/* ─── Action buttons ─────────────────── */}
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
    </SafeAreaView>
  );
}

function InfoView({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={info.row}>
      <View style={info.left}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <Text style={info.label}>{label}</Text>
      </View>
      <Text style={info.value} numberOfLines={2}>
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
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

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
  successText: { flex: 1, fontSize: 13, color: Colors.primary },
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

  // ─── Time row ────────────────────────────────
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
  },
  timeHalf: { flex: 1 },
  timeDivider: {
    width: 24,
    alignItems: 'center',
    paddingTop: 36,
  },
  timeDash: { fontSize: 18, color: Colors.textMuted, fontWeight: '500' },

  // ─── Actions ─────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: { flex: 1, borderRadius: 12 },
});
