import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { openNotificationInbox } from '../navigation/notificationNavigation';
import { useNotifications } from '../context/NotificationContext';

export function NotificationBellButton() {
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
      onPress={openNotificationInbox}
      hitSlop={8}
      style={styles.button}
    >
      <Ionicons name="notifications-outline" size={24} color={Colors.deepTeal} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 8, paddingVertical: 4 },
  badge: {
    position: 'absolute',
    top: -1,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
  },
  badgeText: { color: Colors.white, fontSize: 8, lineHeight: 11, fontWeight: '800' },
});
