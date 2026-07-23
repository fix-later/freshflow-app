import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import {
  notificationApi,
  type NotificationDto,
} from '../api/notificationApi';

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  const normalized = type.toLowerCase();
  if (normalized.includes('order')) return 'receipt-outline';
  if (normalized.includes('delivery')) return 'car-outline';
  if (normalized.includes('credit')) return 'wallet-outline';
  return 'notifications-outline';
}

export function RestaurantNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const page = await notificationApi.list();
      setNotifications(page.data);
      setNextCursor(page.meta.nextCursor);
      setError(null);
    } catch {
      setError('Không thể tải thông báo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await notificationApi.list({ cursor: nextCursor });
      setNotifications((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...page.data.filter((item) => !ids.has(item.id))];
      });
      setNextCursor(page.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

  const markRead = async (item: NotificationDto) => {
    if (item.isRead) return;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id ? { ...notification, isRead: true } : notification,
      ),
    );
    try {
      const updated = await notificationApi.markRead(item.id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? updated : notification,
        ),
      );
    } catch {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? item : notification,
        ),
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primaryText} />
          <Text style={styles.helperText}>Đang tải thông báo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primaryText}
          />
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.25}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => void markRead(item)}
          >
            <View style={[styles.icon, !item.isRead && styles.iconUnread]}>
              <Ionicons
                name={notificationIcon(item.type)}
                size={20}
                color={Colors.primaryText}
              />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="notifications-off-outline" size={54} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {error ?? 'Bạn chưa có thông báo nào'}
            </Text>
            <Text style={styles.helperText}>
              Cập nhật về đơn hàng và giao nhận sẽ xuất hiện tại đây.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primaryText} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 9 },
  emptyList: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardUnread: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  iconUnread: { backgroundColor: Colors.primary },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 13, color: Colors.deepTeal, fontFamily: Fonts.semibold },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.danger },
  body: { marginTop: 4, fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  date: { marginTop: 6, fontSize: 10, color: Colors.textMuted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
  },
  helperText: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: Colors.textMuted,
  },
  footer: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
