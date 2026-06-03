import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '../../../constants/roles';
import { Colors } from '../../../constants/colors';

// Dev-only: mock login for testing role-based navigation.
// Replace this with a real API call when implementing the auth feature.
const MOCK_USERS: { label: string; role: UserRole }[] = [
  { label: 'Nhà hàng', role: UserRole.RESTAURANT },
  { label: 'Market Agent', role: UserRole.MARKET_AGENT },
  { label: 'Hub Staff', role: UserRole.HUB_STAFF },
  { label: 'Tài xế', role: UserRole.DRIVER },
];

export function LoginScreen() {
  const { signIn } = useAuthStore();

  const handleLogin = (role: UserRole) => {
    signIn(
      { id: '1', email: 'dev@freshflow.vn', name: 'Dev User', role },
      'mock-token-dev',
    );
  };

  return (
    <Screen title="FreshFlow" subtitle="Chọn vai trò để vào ứng dụng (dev mode)">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đăng nhập</Text>
        <Text style={styles.cardText}>
          Kết nối API thật sẽ được triển khai ở bước tiếp theo.
        </Text>
        {MOCK_USERS.map(({ label, role }) => (
          <Pressable key={role} style={styles.primaryButton} onPress={() => handleLogin(role)}>
            <Text style={styles.primaryButtonText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: Colors.surface,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    textAlign: 'center',
  },
});
