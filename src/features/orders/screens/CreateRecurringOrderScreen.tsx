import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import {
  Text,
  TextInput,
} from '../../../components/ui/Text';
import { orderApi, type RecurrenceType, type ScheduledOrderItemDto } from '../api/orderApi';
import { pricingApi } from '../../pricing/api/pricingApi';
import { restaurantApi, type DeliveryAddressDto } from '../../restaurant/api/restaurantApi';
import { type MarketDto, type MarketProductDto } from '../../../types/api.types';
import { type RestaurantOrdersStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RestaurantOrdersStackParamList, 'CreateRecurringOrder'>;

type PickerMode = 'date' | 'time' | null;

/** One line the restaurant has picked for the schedule's item template. */
interface PickedItem {
  marketProductId: string;
  quantity: number;
  /** `null` when a saved schedule's item no longer resolves in the currently selected market. */
  product: MarketProductDto | null;
}

const RECURRENCE_OPTIONS: { id: RecurrenceType; label: string; sub: string }[] = [
  { id: 'daily', label: 'Hằng ngày', sub: 'Tự động đặt đơn mỗi ngày' },
  { id: 'weekly', label: 'Hằng tuần', sub: 'Tự động đặt đơn mỗi tuần, đúng thứ của lần đầu' },
];

function getDefaultFirstRun(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(5, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function CreateRecurringOrderScreen({ navigation, route }: Props) {
  const editingId = route.params?.scheduledOrderId;
  const isEditMode = !!editingId;

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(null);
  const [firstRunAt, setFirstRunAt] = useState<Date>(getDefaultFirstRun);
  // Whether the user has touched the date/time picker this session. In edit mode, an active
  // schedule's loaded `firstRunAt` is normally already in the past (it already started running)
  // — BE only re-validates/updates `firstRunAt` when the client actually sends a new value
  // (UpdateScheduledOrderCommandHandler), so this screen must mirror that: only validate and
  // send `firstRunAt` on save if it's a create, or the user explicitly changed it.
  const [firstRunAtEdited, setFirstRunAtEdited] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  // Item template (SCRUM-386) — the background job auto-confirms a real order from this at
  // each due occurrence, instead of leaving an empty draft.
  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [marketProducts, setMarketProducts] = useState<MarketProductDto[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [pickedItems, setPickedItems] = useState<PickedItem[]>([]);
  // Seeded synchronously (not via effect) so `resolvingItems` below is correct from the very
  // first render — an effect would leave a one-tick gap where prefillItems exist but this is
  // still null, which is exactly the race the submit guard below has to rule out.
  const [pendingExistingItems, setPendingExistingItems] = useState<ScheduledOrderItemDto[] | null>(
    () => (!editingId && route.params?.prefillItems?.length ? route.params.prefillItems : null),
  );
  // True from mount until the market search below resolves prefillItems/an edited schedule's
  // items into display data. Create-mode submit must wait for this — see handleSubmit.
  const resolvingItems = pendingExistingItems !== null;

  // Delivery address — auto-taken as the restaurant's default (first), same as ConfirmOrderScreen.
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddressDto[] | null>(null);
  const deliveryAddress = deliveryAddresses?.[0] ?? null;
  const addressesLoaded = deliveryAddresses !== null;

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Sửa lịch đặt hàng' : 'Đặt hàng định kỳ' });
  }, [navigation, isEditMode]);

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const existing = await orderApi.getScheduledOrder(editingId);
        setRecurrenceType(existing.recurrenceType);
        setFirstRunAt(new Date(existing.firstRunAt));
        setFirstRunAtEdited(false);
        setNotes(existing.notes ?? '');
        setPendingExistingItems(existing.items);
      } catch {
        Alert.alert('Lỗi', 'Không thể tải thông tin lịch đặt hàng.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [editingId, navigation]);

  // Refetch on every focus, not just mount — the user may leave to add an address via the
  // "Chưa có địa chỉ giao hàng" link below and come straight back (same pattern as ConfirmOrderScreen).
  useFocusEffect(
    useCallback(() => {
      restaurantApi
        .getDeliveryAddresses()
        .then(setDeliveryAddresses)
        .catch(() => setDeliveryAddresses([]));
    }, []),
  );

  useEffect(() => {
    (async () => {
      try {
        const result = await pricingApi.getMarkets();
        setMarkets(result);
        setSelectedMarketId(result[0]?.id ?? null);
      } catch {
        // markets stays [] — the hydration effect below still proceeds once loadingMarkets
        // flips (see its guard), it just has nothing to search and leaves items unresolved.
      } finally {
        setLoadingMarkets(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedMarketId) {
      setMarketProducts([]);
      return;
    }
    let active = true;
    setLoadingProducts(true);
    pricingApi
      .getMarketProducts(selectedMarketId, { pageSize: 100 })
      .then((result) => {
        if (active) setMarketProducts(result.items);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [selectedMarketId]);

  // Resolve a set of {marketProductId, quantity} lines against live product data so the list can
  // show a name/price instead of a bare id — shared by two sources: an edited schedule's saved
  // items, and prefillItems seeded from a normal order (ConfirmOrderScreen's "Đặt định kỳ với
  // các sản phẩm này"). Items aren't scoped to one market (orders in this app can mix markets —
  // AddDraftOrderItemScreen lets you add from any market to any draft), so this searches every
  // market's listing, not just the one selected in the picker above, stopping early once every
  // line resolves. A line that never resolves (delisted from every market, or the market list
  // itself failed to load) is kept with `product: null` rather than silently dropped, since
  // removing it would change what gets saved without the user asking for that.
  //
  // Gated on `loadingMarkets`, not `markets.length` — an empty result can mean "still loading"
  // or "the fetch failed and it's genuinely empty," and only the former should make this wait.
  // Gating on length would leave `resolvingItems` stuck true forever on a failed markets fetch,
  // permanently blocking create-mode submit (see handleSubmit).
  useEffect(() => {
    if (!pendingExistingItems || loadingMarkets) return;
    let cancelled = false;
    const pending = pendingExistingItems;

    (async () => {
      const remaining = new Set(pending.map((item) => item.marketProductId));
      const resolved = new Map<string, MarketProductDto>();

      for (const market of markets) {
        if (remaining.size === 0) break;
        try {
          const { items } = await pricingApi.getMarketProducts(market.id, { pageSize: 100 });
          for (const product of items) {
            if (remaining.has(product.marketProductId)) {
              resolved.set(product.marketProductId, product);
              remaining.delete(product.marketProductId);
            }
          }
        } catch {
          // Skip a market that fails to load — the remaining markets still get a chance.
        }
      }

      if (cancelled) return;
      setPickedItems(
        pending.map((item) => ({
          marketProductId: item.marketProductId,
          quantity: item.quantity,
          product: resolved.get(item.marketProductId) ?? null,
        })),
      );
      setPendingExistingItems(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingExistingItems, loadingMarkets, markets]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = productQuery.trim().toLocaleLowerCase('vi');
    if (!normalizedQuery) return marketProducts;
    return marketProducts.filter((product) =>
      product.productName.toLocaleLowerCase('vi').includes(normalizedQuery),
    );
  }, [marketProducts, productQuery]);

  const addPickedItem = (product: MarketProductDto) => {
    setPickedItems((current) => {
      const idx = current.findIndex((item) => item.marketProductId === product.marketProductId);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...current, { marketProductId: product.marketProductId, quantity: 1, product }];
    });
    if (formError) setFormError(null);
  };

  const changePickedQuantity = (marketProductId: string, delta: number) => {
    setPickedItems((current) =>
      current
        .map((item) =>
          item.marketProductId === marketProductId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removePickedItem = (marketProductId: string) => {
    setPickedItems((current) => current.filter((item) => item.marketProductId !== marketProductId));
  };

  const applyPicked = (mode: 'date' | 'time', selected: Date) => {
    const merged = new Date(firstRunAt);
    if (mode === 'date') {
      merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setFirstRunAt(merged);
    setFirstRunAtEdited(true);
    if (formError) setFormError(null);
  };

  const openPicker = (mode: 'date' | 'time') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: firstRunAt,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? new Date() : undefined,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type !== 'dismissed' && selected) applyPicked(mode, selected);
        },
      });
      return;
    }
    setPickerMode(mode);
  };

  // iOS inline spinner fires onChange continuously while scrolling — just apply live, the
  // modal stays open until the user taps "Xong".
  const handleInlinePickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (pickerMode && selected) applyPicked(pickerMode, selected);
  };

  const handleSubmit = async () => {
    if (!recurrenceType) {
      setFormError('Vui lòng chọn chu kỳ lặp lại.');
      return;
    }
    // Create always sets firstRunAt; edit only re-validates it if the user actually changed the
    // picker — otherwise a schedule that already ran (whose original firstRunAt is now in the
    // past by design) could never be re-saved just to tweak notes/items.
    const mustValidateFirstRun = !editingId || firstRunAtEdited;
    if (mustValidateFirstRun && firstRunAt.getTime() <= Date.now()) {
      setFormError('Thời gian chạy lần đầu phải ở trong tương lai.');
      return;
    }
    // Items are create-only for now (see note on the "Sản phẩm" section) — editing an existing
    // schedule never touches them, so this only needs to gate the create path.
    if (!editingId && resolvingItems) {
      setFormError('Đang tải sản phẩm đã chọn, vui lòng đợi giây lát rồi thử lại.');
      return;
    }
    if (!editingId && pickedItems.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 sản phẩm cho lịch đặt hàng.');
      return;
    }
    if (!deliveryAddress) {
      setFormError('Cần có địa chỉ giao hàng trước khi tạo lịch. Vui lòng thêm địa chỉ giao hàng.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await orderApi.updateScheduledOrder(editingId, {
          recurrenceType,
          // Omitted (not sent as an already-past value) unless the user touched the picker —
          // matches UpdateScheduledOrderCommandHandler's "only validate what was sent" semantics.
          firstRunAt: firstRunAtEdited ? firstRunAt.toISOString() : undefined,
          notes: notes.trim() || undefined,
          deliveryAddressId: deliveryAddress.id,
          // `items` deliberately omitted — sending it re-triggers the schedule's item template
          // replacement path, which currently 409s on the backend (EF marks the freshly-replaced
          // items Modified instead of Added, so the UPDATE matches 0 rows). Until that's fixed
          // server-side, editing items from the app is disabled (see the read-only note below).
        });
        Alert.alert('Đã lưu thay đổi', 'Lịch đặt hàng định kỳ đã được cập nhật.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await orderApi.createScheduledOrder({
          recurrenceType,
          firstRunAt: firstRunAt.toISOString(),
          notes: notes.trim() || undefined,
          deliveryAddressId: deliveryAddress.id,
          items: pickedItems.map((item) => ({
            marketProductId: item.marketProductId,
            quantity: item.quantity,
          })),
        });
        Alert.alert('Đã tạo lịch đặt hàng', 'Đến hạn, hệ thống sẽ tự đặt đơn theo mẫu này.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert(
        editingId ? 'Không thể lưu thay đổi' : 'Không thể tạo lịch đặt hàng',
        message ?? 'Vui lòng kiểm tra lại thông tin và thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin lịch đặt hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primaryText} />
          <Text style={styles.infoText}>
            Đến hạn, hệ thống sẽ tự đặt đơn từ danh sách sản phẩm bên dưới. Nếu có vấn đề (hết
            hàng, thiếu địa chỉ, vượt hạn mức công nợ...), đơn sẽ được để ở dạng nháp và bạn sẽ
            nhận thông báo để xử lý tay.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Chu kỳ lặp lại *</Text>
        <View style={styles.card}>
          {RECURRENCE_OPTIONS.map((option) => {
            const selected = recurrenceType === option.id;
            return (
              <Pressable
                key={option.id}
                style={styles.optionRow}
                onPress={() => {
                  setRecurrenceType(option.id);
                  if (formError) setFormError(null);
                }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? Colors.primaryText : Colors.outline}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionSub}>{option.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Thời gian chạy lần đầu *</Text>
        <View style={styles.card}>
          <Pressable style={styles.dateTimeRow} onPress={() => openPicker('date')}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primaryText} />
            <Text style={styles.dateTimeLabel}>Ngày</Text>
            <Text style={styles.dateTimeValue}>{formatDate(firstRunAt)}</Text>
          </Pressable>
          <Pressable style={[styles.dateTimeRow, styles.dateTimeRowLast]} onPress={() => openPicker('time')}>
            <Ionicons name="time-outline" size={18} color={Colors.primaryText} />
            <Text style={styles.dateTimeLabel}>Giờ</Text>
            <Text style={styles.dateTimeValue}>{formatTime(firstRunAt)}</Text>
          </Pressable>
        </View>
        {isEditMode && !firstRunAtEdited ? (
          <Text style={styles.helperCaption}>
            Chỉ cần đổi nếu bạn muốn dời giờ chạy đầu tiên — nếu không đổi, lịch vẫn giữ nguyên.
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Ghi chú</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.textArea}
            placeholder="Ghi chú cho đơn hàng tự động (không bắt buộc)..."
            placeholderTextColor={Colors.outline}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
        </View>

        <Text style={styles.sectionTitle}>{isEditMode ? 'Sản phẩm hiện tại' : 'Sản phẩm đặt định kỳ *'}</Text>
        {isEditMode ? (
          <Text style={styles.helperCaption}>
            Chưa hỗ trợ đổi sản phẩm khi sửa lịch. Muốn đổi sản phẩm, vui lòng huỷ lịch này và tạo lịch mới.
          </Text>
        ) : null}
        {!isEditMode ? (
          <View style={styles.card}>
            {loadingMarkets || resolvingItems ? (
              // Also covers resolvingItems, not just loadingMarkets — this section lets the user
              // add/adjust items by marketProductId, and the prefill-hydration effect below
              // finishes by overwriting pickedItems wholesale from the original prefill list. If
              // browsing stayed interactive during that window, an item added here mid-resolve
              // would just get silently wiped out when hydration completes.
              <View style={styles.centeredInline}>
                <ActivityIndicator size="small" color={Colors.primary} />
                {resolvingItems ? (
                  <Text style={styles.helperCaption}>Đang tải sản phẩm đã chọn...</Text>
                ) : null}
              </View>
            ) : (
              <>
                <FlatList
                  horizontal
                  data={markets}
                  keyExtractor={(market) => market.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.marketList}
                  renderItem={({ item }) => {
                    const selected = item.id === selectedMarketId;
                    return (
                      <Pressable
                        style={[styles.marketChip, selected && styles.marketChipSelected]}
                        onPress={() => setSelectedMarketId(item.id)}
                      >
                        <Text style={[styles.marketChipText, selected && styles.marketChipTextSelected]}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={productQuery}
                    onChangeText={setProductQuery}
                    placeholder="Tìm sản phẩm..."
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                {loadingProducts ? (
                  <View style={styles.centeredInline}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : (
                  visibleProducts.map((product) => {
                    const picked = pickedItems.find((i) => i.marketProductId === product.marketProductId);
                    return (
                      <View key={product.marketProductId} style={styles.productRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.productName}>{product.productName}</Text>
                          <Text style={styles.productMeta}>
                            {product.currentPrice.toLocaleString('vi-VN')}đ · Còn {product.availableQuantity} {product.unit}
                          </Text>
                        </View>
                        {picked ? (
                          <View style={styles.quantityRow}>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => changePickedQuantity(product.marketProductId, -1)}
                            >
                              <Ionicons name="remove" size={15} color={Colors.primaryText} />
                            </Pressable>
                            <Text style={styles.quantityText}>{picked.quantity}</Text>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => changePickedQuantity(product.marketProductId, 1)}
                            >
                              <Ionicons name="add" size={15} color={Colors.primaryText} />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable style={styles.addButton} onPress={() => addPickedItem(product)}>
                            <Text style={styles.addButtonText}>Thêm</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}
          </View>
        ) : null}

        {pickedItems.length > 0 ? (
          <View style={[styles.card, { marginTop: 8 }]}>
            {pickedItems.map((item) => (
              <View key={item.marketProductId} style={styles.pickedRow}>
                <Text style={styles.pickedName} numberOfLines={1}>
                  {item.product?.productName ?? item.marketProductId}
                  {!item.product ? '  ·  sản phẩm không còn tồn tại' : ''}
                </Text>
                <Text style={styles.pickedQty}>x{item.quantity}</Text>
                {!isEditMode ? (
                  <Pressable onPress={() => removePickedItem(item.marketProductId)}>
                    <Ionicons name="close-circle" size={20} color={Colors.outline} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
        <View style={styles.card}>
          {!addressesLoaded ? (
            <View style={styles.centeredInline}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : deliveryAddress ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color={Colors.primaryText} />
              <Text style={styles.addressText}>{deliveryAddress.addressLine}</Text>
            </View>
          ) : (
            <Pressable style={styles.addressRow} onPress={() => navigation.navigate('DeliveryAddresses')}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
              <Text style={[styles.addressText, { color: Colors.error }]}>
                Chưa có địa chỉ giao hàng. Nhấn để thêm.
              </Text>
            </Pressable>
          )}
        </View>

        {formError ? <Text style={styles.errorMsgText}>{formError}</Text> : null}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submitBtn,
            (submitting || (!isEditMode && resolvingItems)) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || (!isEditMode && resolvingItems)}
        >
          {submitting
            ? <ActivityIndicator color={Colors.onPrimary} size="small" />
            : <Text style={styles.submitBtnText}>{editingId ? 'Lưu thay đổi' : 'Tạo lịch đặt hàng'}</Text>
          }
        </Pressable>
      </View>

      {/* iOS only — Android shows its own native dialog via DateTimePickerAndroid.open */}
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.pickerBackdrop}>
          <TouchableWithoutFeedback onPress={() => setPickerMode(null)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>
                {pickerMode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
              </Text>
              <Pressable onPress={() => setPickerMode(null)}>
                <Text style={styles.pickerDoneText}>Xong</Text>
              </Pressable>
            </View>
            {pickerMode ? (
              <DateTimePicker
                value={firstRunAt}
                mode={pickerMode}
                display={pickerMode === 'date' ? 'inline' : 'spinner'}
                is24Hour
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                onChange={handleInlinePickerChange}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.outline, fontWeight: '500' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  optionLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  optionSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.onSurface,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  dateTimeRowLast: { borderBottomWidth: 0 },
  dateTimeLabel: { flex: 1, fontSize: 14, color: Colors.onSurface },
  dateTimeValue: { fontSize: 14, fontWeight: '700', color: Colors.primaryText },
  helperCaption: { fontSize: 11, color: Colors.textMuted, marginTop: 6, lineHeight: 15 },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerSheet: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: Colors.primaryText },
  textArea: {
    minHeight: 90,
    padding: 14,
    fontSize: 14,
    color: Colors.onSurface,
    textAlignVertical: 'top',
  },
  errorMsgText: { fontSize: 12, color: Colors.error, marginTop: 8 },

  centeredInline: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  marketList: { gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  marketChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 20,
  },
  marketChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  marketChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  marketChipTextSelected: { color: Colors.primaryText, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
  },
  searchInput: { flex: 1, minHeight: 40, fontSize: 14, color: Colors.textPrimary },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  productName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  productMeta: { marginTop: 2, fontSize: 11, color: Colors.textMuted },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  quantityText: { minWidth: 18, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: Colors.primary,
  },
  addButtonText: { color: Colors.onPrimary, fontSize: 12, fontWeight: '800' },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  pickedName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  pickedQty: { fontSize: 13, fontWeight: '700', color: Colors.primaryText },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  addressText: { flex: 1, fontSize: 13, color: Colors.textPrimary },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  submitBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
