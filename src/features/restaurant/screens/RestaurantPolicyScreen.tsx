import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import {
  RESTAURANT_POLICY_EFFECTIVE_DATE,
  RESTAURANT_POLICY_SECTIONS,
  RESTAURANT_POLICY_VERSION,
  type RestaurantPolicySection,
} from '../data/restaurantPolicy';

function PolicySection({
  section,
  index,
}: {
  section: RestaurantPolicySection;
  index: number;
}) {
  const sectionNumber = index + 1;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {sectionNumber}. {section.title}
      </Text>

      {section.items.map((item, itemIndex) => (
        <View key={`${section.id}-${itemIndex}`} style={styles.policyRow}>
          <Text numeric style={styles.policyNumber}>
            {sectionNumber}.{itemIndex + 1}
          </Text>
          <Text style={styles.policyText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function RestaurantPolicyScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.documentHeader}>
          <Text style={styles.documentTitle}>CHÍNH SÁCH VẬN HÀNH</Text>
          <Text style={styles.documentTitle}>DÀNH CHO NHÀ HÀNG</Text>
          <Text style={styles.documentSubtitle}>
            Áp dụng cho hoạt động đặt hàng, giao nhận, thanh toán và xử lý sự cố trên nền tảng FreshFlow
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Phiên bản: {RESTAURANT_POLICY_VERSION}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>Ngày hiệu lực: {RESTAURANT_POLICY_EFFECTIVE_DATE}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <Text style={styles.noteText}>
          <Text style={styles.noteLabel}>Lưu ý: </Text>
          Với các thông số có thể thay đổi như giờ chốt đơn, cửa sổ đặt lịch, giá, thuế và phí giao hàng, dữ liệu hiển thị tại bước xác nhận trên ứng dụng được ưu tiên áp dụng.
        </Text>

        {RESTAURANT_POLICY_SECTIONS.map((section, index) => (
          <PolicySection key={section.id} section={section} index={index} />
        ))}

        <View style={styles.documentFooter}>
          <View style={styles.rule} />
          <Text style={styles.footerText}>
            FreshFlow cảm ơn nhà hàng đã đồng hành để xây dựng chuỗi cung ứng minh bạch và hiệu quả.
          </Text>
          <Text style={styles.footerMeta}>
            FreshFlow · Phiên bản {RESTAURANT_POLICY_VERSION} · Hiệu lực {RESTAURANT_POLICY_EFFECTIVE_DATE}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
  },
  documentHeader: { alignItems: 'center', paddingHorizontal: 4 },
  documentTitle: {
    color: Colors.primaryText,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  documentSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  metaText: { color: Colors.textPrimary, fontSize: 12, lineHeight: 18 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderDark, marginVertical: 18 },
  noteText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 21 },
  noteLabel: { color: Colors.textPrimary, fontWeight: '600' },
  section: { marginBottom: 22 },
  sectionTitle: {
    color: Colors.primaryText,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  policyNumber: {
    width: 48,
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 22,
  },
  policyText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  documentFooter: { marginTop: 4 },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footerMeta: {
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
  },
});
