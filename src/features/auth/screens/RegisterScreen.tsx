import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { AuthStackParamList } from '../../../navigation/types';
import { Colors } from '../../../constants/colors';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'> & {
  onSignIn: () => void;
};

export function RegisterScreen({ navigation, onSignIn }: RegisterScreenProps) {
  return (
    <Screen title="Tạo tài khoản" subtitle="Màn hình đăng ký sẽ được mở rộng khi tích hợp backend.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Khung đăng ký</Text>
        <Text style={styles.cardText}>
          Tạm thời đây là placeholder để giữ đúng cấu trúc Auth cho giai đoạn đầu.
        </Text>

        <Pressable style={styles.primaryButton} onPress={onSignIn}>
          <Text style={styles.primaryButtonText}>Tạo tài khoản mẫu</Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Quay lại đăng nhập</Text>
        </Pressable>
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
    backgroundColor: Colors.success,
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
