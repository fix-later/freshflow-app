import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import type { HubStackParamList } from '../../../navigation/types';
import { HANDOFF_PACKAGES } from '../data/hubOperations';

type Props = NativeStackScreenProps<HubStackParamList, 'DriverHandoff'>;

export function DriverHandoffScreen({ navigation }: Props) {
  const [checkedPackages, setCheckedPackages] = useState(new Set<string>());
  const [signed, setSigned] = useState(false);
  const ready = checkedPackages.size === HANDOFF_PACKAGES.length && signed;

  const togglePackage = (id: string) => {
    setCheckedPackages((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    Alert.alert('Bàn giao thành công', 'Tuyến RT-Q1Q3-01 đã được gửi đến tài xế Nguyễn Minh Khang.', [
      { text: 'Về tổng quan', onPress: () => navigation.navigate('HubTabs', { screen: 'HubDashboard' }) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.routeCard}>
            <View style={styles.routeTop}><View><Text style={styles.routeLabel}>TUYẾN GIAO</Text><Text style={styles.routeCode}>RT-Q1Q3-01</Text><Text style={styles.routeZone}>Quận 1 · Quận 3</Text></View><View style={styles.readyBadge}><Ionicons name="checkmark-circle" size={15} color={Colors.primary} /><Text style={styles.readyText}>Sẵn sàng</Text></View></View>
            <View style={styles.routeStats}><Stat value="3" label="điểm giao" /><Stat value="348 kg" label="khối lượng" /><Stat value="08:00" label="xuất phát" /></View>
          </View>

          <Text style={styles.sectionTitle}>Thông tin tài xế</Text>
          <View style={styles.driverCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>K</Text></View>
            <View style={styles.driverCopy}><Text style={styles.driverName}>Nguyễn Minh Khang</Text><Text style={styles.driverMeta}>Tài xế FreshFlow · 51D-482.16</Text></View>
            <Pressable accessibilityLabel="Gọi tài xế" style={styles.callButton}><Ionicons name="call-outline" size={18} color={Colors.primary} /></Pressable>
          </View>

          <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Kiểm tra kiện hàng</Text><Text style={styles.sectionSubtitle}>{checkedPackages.size}/{HANDOFF_PACKAGES.length} nhóm kiện đã xác nhận</Text></View><Ionicons name="cube-outline" size={20} color={Colors.primary} /></View>
          <View style={styles.packageList}>
            {HANDOFF_PACKAGES.map((item) => {
              const checked = checkedPackages.has(item.id);
              return (
                <Pressable key={item.id} style={[styles.packageCard, checked && styles.packageCardChecked]} onPress={() => togglePackage(item.id)}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked && <Ionicons name="checkmark" size={16} color={Colors.onPrimary} />}</View>
                  <View style={styles.packageCopy}><Text style={styles.packageCode}>{item.code}</Text><Text style={styles.packageRestaurant}>{item.restaurant}</Text></View>
                  <Text style={styles.packageCount}>{item.packageCount} kiện</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Xác nhận của tài xế</Text>
          <Pressable style={[styles.signaturePad, signed && styles.signaturePadSigned]} onPress={() => setSigned((value) => !value)}>
            {signed ? (
              <><Text style={styles.signatureName}>Nguyễn Minh Khang</Text><View style={styles.signatureLine} /><Text style={styles.signatureHint}>Chạm để ký lại</Text></>
            ) : (
              <><Ionicons name="create-outline" size={25} color={Colors.primary} /><Text style={styles.signatureTitle}>Chạm để tài xế xác nhận</Text><Text style={styles.signatureHint}>Xác nhận đã kiểm đủ kiện hàng</Text></>
            )}
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled={!ready} style={[styles.confirmButton, !ready && styles.confirmButtonDisabled]} onPress={confirm}>
            <Text style={styles.confirmText}>Xác nhận bàn giao</Text><Ionicons name="checkmark-done" size={19} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceContainerLowest },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 24 },
  routeCard: { borderRadius: 8, backgroundColor: Colors.primary, padding: 14 },
  routeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  routeLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  routeCode: { fontSize: 18, fontWeight: '800', color: Colors.onPrimary, marginTop: 3 },
  routeZone: { fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, backgroundColor: Colors.onPrimary },
  readyText: { fontSize: 8, fontWeight: '800', color: Colors.primary },
  routeStats: { flexDirection: 'row', marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 12, fontWeight: '800', color: Colors.onPrimary },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.66)', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginTop: 19, marginBottom: 9 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 9 },
  sectionHeadingText: { flex: 1 },
  sectionHeadingIcon: { marginLeft: 8 },
  sectionSubtitle: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  driverCard: { borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 11, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  driverCopy: { flex: 1, paddingHorizontal: 10 },
  driverName: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  driverMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  callButton: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  packageList: { gap: 8 },
  packageCard: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 11, flexDirection: 'row', alignItems: 'center' },
  packageCardChecked: { borderColor: Colors.primary, backgroundColor: Colors.successLight },
  checkbox: { width: 25, height: 25, borderRadius: 6, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  packageCopy: { flex: 1, paddingHorizontal: 9 },
  packageCode: { fontSize: 11, fontWeight: '800', color: Colors.textPrimary },
  packageRestaurant: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  packageCount: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  signaturePad: { height: 126, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  signaturePadSigned: { borderStyle: 'solid', backgroundColor: Colors.surfaceContainerLowest },
  signatureTitle: { fontSize: 11, fontWeight: '800', color: Colors.primary, marginTop: 7 },
  signatureHint: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  signatureName: { fontSize: 21, fontStyle: 'italic', color: Colors.primary },
  signatureLine: { width: '62%', height: 1, backgroundColor: Colors.outline, marginTop: 5 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, padding: 10 },
  confirmButton: { height: 46, borderRadius: 8, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  confirmButtonDisabled: { backgroundColor: Colors.textMuted },
  confirmText: { fontSize: 11, fontWeight: '800', color: Colors.onPrimary },
});
