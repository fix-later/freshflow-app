import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import type { HubStackParamList } from '../../../navigation/types';
import { SORT_GROUPS } from '../data/hubOperations';

type Navigation = NativeStackNavigationProp<HubStackParamList>;

export function SortingScreen() {
  const navigation = useNavigation<Navigation>();
  const initiallyChecked = SORT_GROUPS
    .filter((group) => group.status === 'completed')
    .flatMap((group) => group.items.map((item) => item.id));
  const [checkedItems, setCheckedItems] = useState(new Set(initiallyChecked));
  const [expandedId, setExpandedId] = useState(SORT_GROUPS[0].id);

  const totalItems = SORT_GROUPS.reduce((sum, group) => sum + group.items.length, 0);
  const completedGroups = useMemo(
    () => SORT_GROUPS.filter((group) => group.items.every((item) => checkedItems.has(item.id))).length,
    [checkedItems],
  );
  const allCompleted = checkedItems.size === totalItems;
  const progress = Math.round((checkedItems.size / totalItems) * 100);

  const toggleItem = (itemId: string) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>KHU PHÂN LOẠI · CA SÁNG</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}><Text style={styles.title}>Phân hàng theo nhà hàng</Text><Text style={styles.subtitle}>{completedGroups}/{SORT_GROUPS.length} đơn đã hoàn tất</Text></View>
            <View style={styles.progressCircle}><Text style={styles.progressValue}>{progress}%</Text></View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        <View style={styles.summaryRow}>
          <Summary icon="restaurant-outline" value={`${SORT_GROUPS.length}`} label="nhà hàng" />
          <Summary icon="checkbox-outline" value={`${checkedItems.size}/${totalItems}`} label="mặt hàng" />
          <Summary icon="grid-outline" value="A-01 → A-03" label="dãy slot" />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.instructionStrip}><Ionicons name="scan-outline" size={18} color={Colors.primary} /><Text style={styles.instructionText}>Đặt đúng hàng vào slot và đánh dấu từng mặt hàng.</Text></View>

          {SORT_GROUPS.map((group) => {
            const expanded = expandedId === group.id;
            const checkedCount = group.items.filter((item) => checkedItems.has(item.id)).length;
            const complete = checkedCount === group.items.length;
            const started = checkedCount > 0;
            return (
              <View key={group.id} style={[styles.groupCard, complete && styles.groupCardComplete]}>
                <Pressable style={styles.groupHeader} onPress={() => setExpandedId(expanded ? '' : group.id)}>
                  <View style={[styles.slotBadge, complete && styles.slotBadgeComplete]}><Text style={[styles.slotText, complete && styles.slotTextComplete]}>{group.slot}</Text></View>
                  <View style={styles.groupCopy}>
                    <Text style={styles.restaurantName}>{group.restaurantName}</Text>
                    <Text style={styles.orderMeta}>{group.orderCode} · {group.district}</Text>
                  </View>
                  <View style={styles.groupStatus}>
                    <Text style={[styles.groupProgress, complete && styles.groupProgressComplete, started && !complete && styles.groupProgressStarted]}>{checkedCount}/{group.items.length}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                  </View>
                </Pressable>

                {expanded && (
                  <View style={styles.itemsList}>
                    {group.items.map((item) => {
                      const checked = checkedItems.has(item.id);
                      return (
                        <Pressable key={item.id} style={styles.itemRow} onPress={() => toggleItem(item.id)}>
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked && <Ionicons name="checkmark" size={15} color={Colors.onPrimary} />}</View>
                          <View style={styles.itemCopy}><Text style={[styles.itemName, checked && styles.itemNameChecked]}>{item.name}</Text><Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text></View>
                          <Ionicons name="reorder-three-outline" size={19} color={Colors.textMuted} />
                        </Pressable>
                      );
                    })}
                    <View style={[styles.groupFooter, complete && styles.groupFooterComplete]}>
                      <Ionicons name={complete ? 'checkmark-circle' : 'time-outline'} size={17} color={complete ? Colors.primary : '#8A5900'} />
                      <Text style={[styles.groupFooterText, complete && styles.groupFooterTextComplete]}>{complete ? 'Slot đã sẵn sàng đóng gói' : 'Tiếp tục kiểm đủ mặt hàng'}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <Pressable
            disabled={!allCompleted}
            style={[styles.handoffButton, !allCompleted && styles.handoffButtonDisabled]}
            onPress={() => navigation.navigate('DriverHandoff', { routeId: 'route-1' })}
          >
            <Ionicons name="car-outline" size={19} color={Colors.onPrimary} />
            <Text style={styles.handoffText}>Hoàn tất và bàn giao tài xế</Text>
            <Ionicons name="arrow-forward" size={17} color={Colors.onPrimary} />
          </Pressable>
          {!allCompleted && <Text style={styles.disabledHint}>Hoàn tất tất cả mặt hàng để chuyển sang bàn giao.</Text>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Summary({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return <View style={styles.summaryItem}><Ionicons name={icon} size={17} color={Colors.primary} /><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 17 },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  title: { color: Colors.onPrimary, fontSize: 19, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 4 },
  progressCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: Colors.onPrimary, fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primaryFixed },
  summaryRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 13, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, paddingVertical: 10 },
  summaryItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.surfaceContainerHigh },
  summaryValue: { fontSize: 11, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  summaryLabel: { fontSize: 8, color: Colors.textMuted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  instructionStrip: { borderRadius: 8, backgroundColor: Colors.successLight, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  instructionText: { flex: 1, fontSize: 9, color: Colors.textSecondary },
  groupCard: { borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, overflow: 'hidden' },
  groupCardComplete: { borderColor: Colors.primary },
  groupHeader: { minHeight: 66, padding: 11, flexDirection: 'row', alignItems: 'center' },
  slotBadge: { width: 42, height: 42, borderRadius: 8, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  slotBadgeComplete: { backgroundColor: Colors.successLight },
  slotText: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary },
  slotTextComplete: { color: Colors.primary },
  groupCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  restaurantName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  orderMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  groupStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupProgress: { fontSize: 9, fontWeight: '800', color: Colors.textMuted },
  groupProgressStarted: { color: '#8A5900' },
  groupProgressComplete: { color: Colors.primary },
  itemsList: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh, paddingHorizontal: 11 },
  itemRow: { minHeight: 47, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemCopy: { flex: 1, paddingHorizontal: 9 },
  itemName: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },
  itemNameChecked: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  itemQuantity: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  groupFooter: { marginVertical: 9, borderRadius: 7, backgroundColor: Colors.warningLight, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  groupFooterComplete: { backgroundColor: Colors.successLight },
  groupFooterText: { fontSize: 9, fontWeight: '700', color: '#8A5900' },
  groupFooterTextComplete: { color: Colors.primary },
  handoffButton: { height: 46, borderRadius: 8, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  handoffButtonDisabled: { backgroundColor: Colors.textMuted },
  handoffText: { color: Colors.onPrimary, fontSize: 11, fontWeight: '800' },
  disabledHint: { textAlign: 'center', fontSize: 9, color: Colors.textMuted, marginTop: -3 },
});
