import { Alert, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

export function LogoutButton() {
  const { signOut } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn muốn đăng xuất khỏi FreshFlow?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
      ],
    );
  };

  return (
    <Pressable onPress={handleLogout} style={styles.btn} hitSlop={8}>
      <Ionicons name="log-out-outline" size={24} color={Colors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
