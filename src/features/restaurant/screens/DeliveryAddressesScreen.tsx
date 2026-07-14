import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';
import { GoongLocationPicker, type PickedLocation } from '../../../components/GoongLocationPicker';
import {
  restaurantApi,
  type DeliveryAddressDto,
  type CreateDeliveryAddressPayload,
} from '../api/restaurantApi';

// ─── Form state ─────────────────────────────────────────────────────────────

interface AddressForm {
  addressLine: string;
  recipientName: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

const EMPTY_FORM: AddressForm = {
  addressLine: '',
  recipientName: '',
  phone: '',
  latitude: null,
  longitude: null,
  isDefault: false,
};

// ─── Address card ────────────────────────────────────────────────────────────

function AddressCard({
  item,
  onEdit,
  onDelete,
}: {
  item: DeliveryAddressDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons name="location" size={18} color={Colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName}>{item.recipientName}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Mặc định</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardPhone}>{item.phone}</Text>
          <Text style={styles.cardAddr} numberOfLines={2}>{item.addressLine}</Text>
          {item.latitude !== null && item.longitude !== null && (
            <View style={styles.coordRow}>
              <Ionicons name="navigate-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.coordText}>
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.cardActionBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
          <Text style={styles.cardActionText}>Sửa</Text>
        </Pressable>
        <View style={styles.cardActionDivider} />
        <Pressable style={styles.cardActionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
          <Text style={[styles.cardActionText, { color: Colors.error }]}>Xoá</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function DeliveryAddressesScreen() {
  const [addresses, setAddresses] = useState<DeliveryAddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Map picker step
  const [showMap, setShowMap] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await restaurantApi.getDeliveryAddresses();
      setAddresses(data);
    } catch {
      setLoadError('Không thể tải danh sách địa chỉ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setField = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaveError(null);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowMap(false);
    setShowForm(true);
  };

  const openEdit = (item: DeliveryAddressDto) => {
    setEditingId(item.id);
    setForm({
      addressLine: item.addressLine,
      recipientName: item.recipientName,
      phone: item.phone,
      latitude: item.latitude,
      longitude: item.longitude,
      isDefault: item.isDefault,
    });
    setSaveError(null);
    setShowMap(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowMap(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
  };

  const handleLocationPicked = (loc: PickedLocation) => {
    setForm(prev => ({
      ...prev,
      latitude: loc.lat,
      longitude: loc.lng,
      addressLine: loc.address || prev.addressLine,
    }));
    setShowMap(false);
  };

  const handleSave = async () => {
    if (!form.addressLine.trim() || !form.recipientName.trim() || !form.phone.trim()) {
      setSaveError('Vui lòng điền đầy đủ địa chỉ, tên và số điện thoại.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    const payload: CreateDeliveryAddressPayload = {
      addressLine: form.addressLine.trim(),
      recipientName: form.recipientName.trim(),
      phone: form.phone.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      isDefault: form.isDefault,
    };
    try {
      if (editingId) {
        const updated = await restaurantApi.updateDeliveryAddress(editingId, payload);
        setAddresses(prev => prev.map(a => a.id === editingId ? updated : a));
      } else {
        const created = await restaurantApi.createDeliveryAddress(payload);
        setAddresses(prev => [...prev, created]);
      }
      closeForm();
    } catch {
      setSaveError('Lưu không thành công. Vui lòng thử lại.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = (item: DeliveryAddressDto) => {
    Alert.alert(
      'Xoá địa chỉ',
      `Bạn có chắc muốn xoá địa chỉ "${item.addressLine}"?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              await restaurantApi.deleteDeliveryAddress(item.id);
              setAddresses(prev => prev.filter(a => a.id !== item.id));
            } catch {
              Alert.alert('Lỗi', 'Không thể xoá địa chỉ. Vui lòng thử lại.');
            }
          },
        },
      ],
    );
  };

  const canSave = form.addressLine.trim().length > 0
    && form.recipientName.trim().length > 0
    && form.phone.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.outline} />
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {addresses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="location-outline" size={52} color={Colors.outline} />
              <Text style={styles.emptyTitle}>Chưa có địa chỉ giao hàng</Text>
              <Text style={styles.emptySub}>Thêm địa chỉ để nhận hàng từ FreshFlow</Text>
            </View>
          ) : (
            addresses.map(item => (
              <AddressCard
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))
          )}

          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.addBtnText}>Thêm địa chỉ mới</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ─── Add / Edit form modal ─────────────────────────── */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <SafeAreaView style={styles.modalSafe} edges={['bottom']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={closeForm} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.modalTitle}>
                {editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Map picker section */}
              {showMap ? (
                <View style={styles.mapSection}>
                  <View style={styles.mapHeader}>
                    <Text style={styles.mapLabel}>Chọn vị trí trên bản đồ</Text>
                    <Pressable onPress={() => setShowMap(false)} style={styles.mapDoneBtn}>
                      <Text style={styles.mapDoneBtnText}>Xong</Text>
                    </Pressable>
                  </View>
                  <GoongLocationPicker
                    initialLat={form.latitude ?? undefined}
                    initialLng={form.longitude ?? undefined}
                    onLocationPicked={handleLocationPicked}
                    style={styles.mapPicker}
                  />
                  <Text style={styles.mapHint}>
                    Chạm vào bản đồ để đặt điểm. Địa chỉ sẽ được tự động điền.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Location card */}
                  <View style={styles.locationCard}>
                    <View style={styles.locationCardTop}>
                      <Ionicons name="navigate-circle-outline" size={20} color={Colors.primary} />
                      <Text style={styles.locationCardTitle}>Toạ độ GPS</Text>
                    </View>

                    {form.latitude !== null && form.longitude !== null ? (
                      <View style={styles.coordDisplay}>
                        <Text style={styles.coordDisplayText}>
                          {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                        </Text>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      </View>
                    ) : (
                      <Text style={styles.noCoordText}>Chưa có toạ độ</Text>
                    )}

                    <Pressable
                      style={({ pressed }) => [styles.pickMapBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => setShowMap(true)}
                    >
                      <Ionicons name="map-outline" size={16} color={Colors.onPrimary} />
                      <Text style={styles.pickMapBtnText}>
                        {form.latitude !== null ? 'Đổi vị trí trên bản đồ' : 'Chọn vị trí trên bản đồ'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Address line */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Địa chỉ giao hàng *</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={form.addressLine}
                        onChangeText={v => setField('addressLine', v)}
                        placeholder="Số nhà, đường, phường, quận..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  </View>

                  {/* Recipient name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Tên người nhận *</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={form.recipientName}
                        onChangeText={v => setField('recipientName', v)}
                        placeholder="Họ tên người nhận hàng"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Số điện thoại *</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={form.phone}
                        onChangeText={v => setField('phone', v)}
                        placeholder="0901 234 567"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  {/* isDefault toggle */}
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.switchLabel}>Đặt làm địa chỉ mặc định</Text>
                      <Text style={styles.switchHint}>Tự động dùng khi đặt đơn hàng mới</Text>
                    </View>
                    <Switch
                      value={form.isDefault}
                      onValueChange={v => setField('isDefault', v)}
                      trackColor={{ false: Colors.outlineVariant, true: Colors.primary + '80' }}
                      thumbColor={form.isDefault ? Colors.primary : '#f4f3f4'}
                    />
                  </View>

                  {/* Error banner */}
                  {saveError && (
                    <View style={styles.errorBanner}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                      <Text style={styles.errorBannerText}>{saveError}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Save button */}
            {!showMap && (
              <View style={styles.saveBarWrap}>
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    (!canSave || saveLoading) && styles.saveBtnDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleSave}
                  disabled={!canSave || saveLoading}
                >
                  {saveLoading
                    ? <ActivityIndicator size="small" color={Colors.onPrimary} />
                    : <Ionicons name="checkmark-circle-outline" size={18} color={Colors.onPrimary} />
                  }
                  <Text style={styles.saveBtnText}>
                    {saveLoading ? 'Đang lưu...' : editingId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
                  </Text>
                </Pressable>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 14, color: Colors.textMuted },
  errorText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  listContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // Empty state
  emptyBox: {
    alignItems: 'center', gap: 8,
    paddingVertical: 48, paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Address card
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', gap: 12,
    padding: 14,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight ?? '#f0faf4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  defaultBadge: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cardPhone: { fontSize: 12, color: Colors.textMuted },
  cardAddr: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  coordText: { fontSize: 11, color: Colors.textMuted },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  cardActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  cardActionDivider: { width: 1, backgroundColor: Colors.outlineVariant },
  cardActionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary + '60',
    paddingVertical: 16,
    backgroundColor: Colors.primaryLight ?? '#f0faf4',
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  modalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },

  formContent: { padding: 16, gap: 16, paddingBottom: 8 },

  // Map section
  mapSection: { gap: 8 },
  mapHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  mapLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  mapDoneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6,
  },
  mapDoneBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onPrimary },
  mapPicker: { height: 340, borderRadius: 14 },
  mapHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },

  // Location card
  locationCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  locationCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  coordDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight ?? '#f0faf4',
    borderRadius: 8, padding: 8,
  },
  coordDisplayText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.primary, fontVariant: ['tabular-nums'] },
  noCoordText: { fontSize: 12, color: Colors.textMuted },
  pickMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 10, paddingVertical: 10,
  },
  pickMapBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onPrimary },

  // Form fields
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    gap: 10, borderWidth: 1, borderColor: Colors.outlineVariant,
    minHeight: 48,
  },
  input: {
    flex: 1, fontSize: 15, color: Colors.textPrimary,
    padding: 0, textAlignVertical: 'top',
  },

  // Switch
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  switchHint: { fontSize: 12, color: Colors.textMuted },

  // Error banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error },

  // Save button
  saveBarWrap: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 14,
  },
  saveBtnDisabled: { backgroundColor: Colors.outline },
  saveBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
