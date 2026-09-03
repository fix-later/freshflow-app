import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { RoleGate, useHasRole } from '../features/auth';
import { UserRole } from '../constants/roles';
import { useAuthStore } from '../store/authStore';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.RESTAURANT]: 'Nhà hàng',
  [UserRole.MARKET_AGENT]: 'Nhân viên thu mua',
  [UserRole.HUB_STAFF]: 'Nhân viên Hub',
  [UserRole.DRIVER]: 'Tài xế',
};

export function NotificationsScreen() {
  const { user } = useAuthStore();
  const isDriver = useHasRole(UserRole.DRIVER);
  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? 'Người dùng' : 'Khách';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Thông báo</Text>
        <Text style={styles.sub}>Các cập nhật mới dành cho bạn</Text>
      </View>

      {/* Demo Section for Role-Based Access Control Verification */}
      <View style={styles.rbacDemo}>
        <Text style={styles.demoTitle}>🛡️ Thông tin dành cho bạn</Text>
        <Text style={styles.roleInfo}>
          Tài khoản: <Text style={styles.roleBadge}>{user?.name || 'Chưa đăng nhập'}</Text>
          {' · '} Phạm vi: <Text style={[styles.roleBadge, styles.roleName]}>{roleLabel}</Text>
        </Text>

        <View style={styles.cardContainer}>
          {/* Case 1: RoleGate only for RESTAURANT */}
          <RoleGate allowedRoles={UserRole.RESTAURANT}>
            <View style={[styles.card, styles.restaurantCard]}>
              <Text style={styles.cardHeader}>🏪 Dành cho nhà hàng</Text>
              <Text style={styles.cardBody}>Theo dõi đơn hàng, công nợ và các cập nhật dành cho nhà hàng tại đây.</Text>
            </View>
          </RoleGate>

          {/* Case 2: RoleGate only for DRIVER */}
          <RoleGate allowedRoles={UserRole.DRIVER}>
            <View style={[styles.card, styles.driverCard]}>
              <Text style={styles.cardHeader}>🚚 Dành cho tài xế</Text>
              <Text style={styles.cardBody}>Tuyến đường giao hàng của bạn đã được Hub cập nhật.</Text>
            </View>
          </RoleGate>

          {/* Case 3: RoleGate for HUB_STAFF or MARKET_AGENT */}
          <RoleGate allowedRoles={[UserRole.HUB_STAFF, UserRole.MARKET_AGENT]}>
            <View style={[styles.card, styles.agentCard]}>
              <Text style={styles.cardHeader}>💼 Dành cho nhân viên vận hành</Text>
              <Text style={styles.cardBody}>Vui lòng cập nhật bảng giá và kiểm tra tồn kho tại điểm tập kết.</Text>
            </View>
          </RoleGate>

          {/* Case 4: RoleGate with Fallback UI */}
          <RoleGate 
            allowedRoles={UserRole.RESTAURANT}
            fallback={
              <View style={[styles.card, styles.fallbackCard]}>
                <Text style={styles.cardHeaderFallback}>🔒 Tính năng không khả dụng</Text>
                <Text style={styles.cardBodyFallback}>
                  {isDriver
                    ? 'Tài khoản tài xế không thể sử dụng tính năng đặt hàng.'
                    : 'Tài khoản của bạn không thể sử dụng tính năng đặt hàng.'
                  }
                </Text>
              </View>
            }
          >
            <View style={[styles.card, styles.successCard]}>
              <Text style={styles.cardHeader}>✨ Đặt hàng nhanh chóng</Text>
              <Text style={styles.cardBody}>Bạn có thể chọn sản phẩm và tạo đơn hàng mới ngay trên FreshFlow.</Text>
            </View>
          </RoleGate>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
    padding: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 10,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: Colors.textPrimary 
  },
  sub: { 
    fontSize: 14, 
    color: Colors.textSecondary, 
    marginTop: 6 
  },
  rbacDemo: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  roleInfo: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
  },
  roleBadge: {
    fontWeight: '600',
    color: '#1E293B',
  },
  roleName: {
    color: Colors.primary,
  },
  cardContainer: {
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  restaurantCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  driverCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  agentCard: {
    backgroundColor: '#FDF2F8',
    borderColor: '#EC4899',
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  fallbackCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#F43F5E',
    borderStyle: 'dashed',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardHeaderFallback: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  cardBodyFallback: {
    fontSize: 12,
    color: '#9F1239',
    lineHeight: 18,
  },
});
