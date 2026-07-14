import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { UserRole } from '../../../constants/roles';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { RestaurantButton } from '../../restaurant/components/RestaurantButton';
import {
  RestaurantText as Text,
  RestaurantTextInput as TextInput,
} from '../../restaurant/components/RestaurantText';
import { RestaurantColors } from '../../restaurant/theme';
import { profileApi } from '../api/profileApi';
import { uploadImageToCloudinary } from '../../../services/cloudinaryUpload';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.RESTAURANT]: 'Nhà hàng',
  [UserRole.MARKET_AGENT]: 'Nhân viên thị trường',
  [UserRole.HUB_STAFF]: 'Nhân viên trung tâm',
  [UserRole.DRIVER]: 'Tài xế',
};

const ROLE_COLOR: Record<UserRole, string> = {
  [UserRole.RESTAURANT]: RestaurantColors.primaryText,
  [UserRole.MARKET_AGENT]: RestaurantColors.primaryText,
  [UserRole.HUB_STAFF]: '#825100',
  [UserRole.DRIVER]: '#5c4033',
};

const CHANGE_PW_ERRORS: Record<string, string> = {
  WRONG_PASSWORD: 'Mật khẩu hiện tại không đúng.',
  WEAK_PASSWORD: 'Mật khẩu mới không đủ mạnh. Vui lòng kiểm tra lại.',
  SAME_PASSWORD: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(pw)) return 'Cần ít nhất 1 chữ hoa.';
  if (!/[0-9]/.test(pw)) return 'Cần ít nhất 1 chữ số.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Cần ít nhất 1 ký tự đặc biệt.';
  return null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  isLoading,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  valueColor?: string;
  isLoading?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.textMuted} />
      ) : (
        <Text
          style={[styles.rowValue, valueColor ? { color: valueColor, fontWeight: '600' } : null]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user, signOut, updateUser } = useAuthStore();

  // Profile fetch
  const [isFetching, setIsFetching] = useState(true);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwError, setChangePwError] = useState<string | null>(null);
  const [changePwDone, setChangePwDone] = useState(false);

  useEffect(() => {
    profileApi
      .getProfile()
      .then((profile) => {
        updateUser({
          name: profile.fullName ?? user?.name,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
        });
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, []);

  // ─── Edit mode handlers ────────────────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
    setEditAvatarUri(null);
    setSaveError(null);
    setIsEditing(true);
  }, [user]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditAvatarUri(null);
    setSaveError(null);
  }, []);

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh trong Cài đặt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setEditAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!editName.trim()) {
      setSaveError('Họ tên không được để trống.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);

    try {
      let finalAvatarUrl = user?.avatarUrl;

      // Upload new avatar to Cloudinary if a new image was picked
      if (editAvatarUri) {
        setAvatarUploading(true);
        try {
          finalAvatarUrl = await uploadImageToCloudinary(editAvatarUri);
        } finally {
          setAvatarUploading(false);
        }
      }

      const updated = await profileApi.updateProfile(
        editName.trim(),
        editPhone.trim(),
        finalAvatarUrl,
      );

      updateUser({
        name: updated.fullName ?? editName.trim(),
        phone: updated.phone ?? editPhone.trim(),
        avatarUrl: updated.avatarUrl ?? finalAvatarUrl,
      });

      setIsEditing(false);
      setEditAvatarUri(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : null) ??
        'Cập nhật thất bại. Vui lòng thử lại.';
      setSaveError(msg);
    } finally {
      setSaveLoading(false);
    }
  }, [editName, editPhone, editAvatarUri, user?.avatarUrl, updateUser]);

  // ─── Change password handlers ──────────────────────────────────────────────

  const toggleChangePw = useCallback(() => {
    setShowChangePw((prev) => !prev);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePwError(null);
    setChangePwDone(false);
  }, []);

  const pwValidationError = newPassword ? validatePassword(newPassword) : null;
  const confirmError =
    confirmPassword && newPassword !== confirmPassword ? 'Mật khẩu xác nhận không khớp.' : null;
  const canSubmitChangePw =
    !changePwLoading &&
    !!currentPassword &&
    !!newPassword &&
    !!confirmPassword &&
    !pwValidationError &&
    !confirmError;

  const handleChangePassword = useCallback(async () => {
    if (!canSubmitChangePw) return;
    setChangePwLoading(true);
    setChangePwError(null);
    try {
      await profileApi.changePassword(currentPassword, newPassword);
      setChangePwDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const fallback =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      setChangePwError(CHANGE_PW_ERRORS[code ?? ''] ?? fallback);
    } finally {
      setChangePwLoading(false);
    }
  }, [canSubmitChangePw, currentPassword, newPassword]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi FreshFlow?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  }, [signOut]);

  if (!user) return null;

  const roleColor = ROLE_COLOR[user.role] ?? Colors.primary;
  const isRestaurant = user.role === UserRole.RESTAURANT;
  const isBrandedRole = isRestaurant || user.role === UserRole.MARKET_AGENT;
  const ActionButton = isBrandedRole ? RestaurantButton : Button;
  const displayAvatarUri = isEditing ? editAvatarUri ?? user.avatarUrl : user.avatarUrl;

  return (
    <SafeAreaView
      style={[styles.safe, isBrandedRole && { backgroundColor: RestaurantColors.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Avatar Section ─────────────────── */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={isEditing ? handlePickAvatar : undefined}
              disabled={!isEditing || avatarUploading}
              style={styles.avatarWrapper}
            >
              {displayAvatarUri ? (
                <Image
                  source={{ uri: displayAvatarUri }}
                  style={[styles.avatarCircle, { backgroundColor: roleColor }]}
                />
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: roleColor }]}>
                  <Text style={styles.avatarInitials}>{getInitials(user.name)}</Text>
                </View>
              )}

              {/* Upload loading overlay */}
              {avatarUploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}

              {/* Camera icon overlay in edit mode */}
              {isEditing && !avatarUploading && (
                <View style={styles.cameraOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              )}
            </Pressable>

            {isEditing ? (
              /* Edit mode: name as input */
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Họ tên"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            ) : (
              <Text style={styles.displayName}>{user.name}</Text>
            )}

            <View style={styles.roleBadgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </Text>
              </View>

              {/* Edit / Cancel toggle button */}
              {!isEditing ? (
                <Pressable
                  style={[styles.editBtn, isBrandedRole && styles.restaurantEditBtn]}
                  onPress={enterEditMode}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={isBrandedRole ? RestaurantColors.primaryText : Colors.primary}
                  />
                  <Text
                    style={[styles.editBtnText, isBrandedRole && styles.restaurantEditBtnText]}
                  >
                    Chỉnh sửa
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
                  <Text style={styles.cancelBtnText}>Huỷ</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ─── Info / Edit Card ───────────────── */}
          <View style={[styles.card, isBrandedRole && styles.restaurantCard]}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

            {isEditing ? (
              /* Edit form */
              <>
                {saveError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{saveError}</Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>Họ tên</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Họ tên"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Số điện thoại</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="0xxxxxxxxx"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <ActionButton
                  title="LƯU THAY ĐỔI"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={saveLoading}
                  onPress={handleSave}
                  disabled={saveLoading || avatarUploading}
                  style={styles.saveBtn}
                />
              </>
            ) : (
              /* View mode */
              <>
                <InfoRow icon="person-outline" label="Họ tên" value={user.name} />
                <View style={styles.separator} />
                <InfoRow icon="mail-outline" label="Email" value={user.email} />
                <View style={styles.separator} />
                <InfoRow
                  icon="call-outline"
                  label="Số điện thoại"
                  value={user.phone ?? 'Chưa cập nhật'}
                  isLoading={isFetching && !user.phone}
                />
                <View style={styles.separator} />
                <InfoRow
                  icon="shield-checkmark-outline"
                  label="Vai trò"
                  value={ROLE_LABEL[user.role] ?? user.role}
                  valueColor={roleColor}
                />
              </>
            )}
          </View>

          {/* ─── Restaurant nav rows (RESTAURANT role only) ── */}
          {user.role === UserRole.RESTAURANT && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  styles.restaurantCard,
                  styles.navRow,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate('RestaurantProfileEdit' as never)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={RestaurantColors.primaryText}
                  />
                  <Text style={styles.changePwTitle}>Thông tin nhà hàng</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  styles.restaurantCard,
                  styles.navRow,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate('CreditOverview' as never)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={RestaurantColors.primaryText}
                  />
                  <Text style={styles.changePwTitle}>Tín dụng & Thanh toán</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            </>
          )}

          {/* ─── Change Password Card ────────────── */}
          <View style={[styles.card, isBrandedRole && styles.restaurantCard]}>
            <Pressable style={styles.changePwHeader} onPress={toggleChangePw}>
              <View style={styles.rowLeft}>
                <Ionicons name="key-outline" size={18} color={Colors.textMuted} />
                <Text style={styles.changePwTitle}>Đổi mật khẩu</Text>
              </View>
              <Ionicons
                name={showChangePw ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>

            {showChangePw && (
              <View style={styles.changePwForm}>
                <View style={styles.separator} />

                {changePwDone ? (
                  <View style={styles.successBox}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={40}
                      color={isBrandedRole ? RestaurantColors.primaryText : Colors.primary}
                    />
                    <Text style={styles.successTitle}>Đổi mật khẩu thành công!</Text>
                    <Text style={styles.successDesc}>Mật khẩu của bạn đã được cập nhật.</Text>
                    <Pressable onPress={toggleChangePw} style={styles.closeDoneBtn}>
                      <Text style={styles.closeDoneText}>Đóng</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {changePwError && (
                      <View style={styles.errorBox}>
                        <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{changePwError}</Text>
                      </View>
                    )}

                    <Text style={styles.fieldLabel}>Mật khẩu hiện tại</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Nhập mật khẩu hiện tại"
                        placeholderTextColor={Colors.textMuted}
                        secureTextEntry={!showCurrent}
                        autoCapitalize="none"
                      />
                      <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                        <Ionicons
                          name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={Colors.textMuted}
                        />
                      </Pressable>
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Mật khẩu mới</Text>
                    <View style={[styles.inputWrapper, pwValidationError ? styles.inputError : null]}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Ít nhất 8 ký tự, hoa, số, đặc biệt"
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
                    {pwValidationError && <Text style={styles.fieldError}>{pwValidationError}</Text>}

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Xác nhận mật khẩu mới</Text>
                    <View style={[styles.inputWrapper, confirmError ? styles.inputError : null]}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Nhập lại mật khẩu mới"
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

                    <ActionButton
                      title="CẬP NHẬT MẬT KHẨU"
                      variant="primary"
                      size="md"
                      fullWidth
                      loading={changePwLoading}
                      onPress={handleChangePassword}
                      disabled={!canSubmitChangePw}
                      style={styles.submitBtn}
                    />
                  </>
                )}
              </View>
            )}
          </View>

          {/* ─── Sign Out ───────────────────────── */}
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutPressed]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.signOutText}>Đăng xuất</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  // ─── Avatar ──────────────────────────────────
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { marginBottom: 14 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
    minWidth: 180,
    textAlign: 'center',
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 13, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  restaurantEditBtn: {
    backgroundColor: RestaurantColors.primaryLight,
    borderWidth: 1,
    borderColor: RestaurantColors.primary,
  },
  restaurantEditBtnText: { color: RestaurantColors.primaryText },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  // ─── Card ────────────────────────────────────
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  restaurantCard: {
    backgroundColor: RestaurantColors.surface,
    borderWidth: 1,
    borderColor: RestaurantColors.border,
    shadowColor: RestaurantColors.deepTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingTop: 14,
    paddingBottom: 10,
  },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, color: Colors.textSecondary },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },

  // ─── Edit form ───────────────────────────────
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
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
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 18 },
  saveBtn: { marginTop: 20, marginBottom: 8, borderRadius: 12 },

  // ─── Change Password ─────────────────────────
  changePwHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  changePwTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  changePwForm: { paddingBottom: 8 },
  submitBtn: { marginTop: 20, marginBottom: 8, borderRadius: 12 },

  // ─── Success ─────────────────────────────────
  successBox: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  successTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  successDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  closeDoneBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  closeDoneText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // ─── Sign Out ─────────────────────────────────
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.errorContainer,
    marginTop: 8,
  },
  signOutPressed: { opacity: 0.7 },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
});
