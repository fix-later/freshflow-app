import { useCallback } from 'react';
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
import { useNotifications } from '../context/NotificationContext';

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
  switch (type.toLowerCase()) {
    case 'order_status': return 'receipt-outline';
    case 'delivery_update': return 'car-outline';
    case 'credit_alert': return 'warning-outline';
    case 'credit_statement': return 'document-text-outline';
    default: return 'notifications-outline';
  }
}

function formatNotificationBody(body: string): string {
  if (!body) return '';
  return body.replace(/\b([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, (_, p1) => `#${p1.toUpperCase()}`);
}

export function RestaurantNotificationsScreen() {
  const {
    notifications,
    loading,
    refreshing,
    loadingMore,
    error,
    nextCursor,
    realtimeConnected,
    syncInbox,
    loadMore,
    openNotification,
  } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      void syncInbox(false);
    }, [syncInbox]),
  );

  if (loading && notifications.length === 0) {
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
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void syncInbox(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primaryText}
          />
        )}
        onEndReached={() => {
          if (nextCursor) void loadMore();
        }}
        onEndReachedThreshold={0.25}
        ListHeaderComponent={(
          <View style={styles.connectionRow}>
            <View style={[
              styles.connectionDot,
              realtimeConnected ? styles.connectionOnline : styles.connectionOffline,
            ]} />
            <Text style={styles.connectionText}>
              {realtimeConnected ? 'Thông báo mới sẽ tự động cập nhật' : 'Đang kiểm tra thông báo mới'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.isRead ? '' : 'Chưa đọc. '}${item.title}`}
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => void openNotification(item)}
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
              <Text style={styles.body}>{formatNotificationBody(item.body)}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={(
          <View style={styles.centered}>
            <Ionicons name="notifications-off-outline" size={54} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{error ?? 'Bạn chưa có thông báo nào'}</Text>
            <Text style={styles.helperText}>
              Cập nhật về đơn hàng, giao nhận và công nợ sẽ xuất hiện tại đây.
            </Text>
          </View>
        )}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={Colors.primaryText} />
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 9 },
  emptyList: { flexGrow: 1 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  connectionOnline: { backgroundColor: Colors.success },
  connectionOffline: { backgroundColor: Colors.textMuted },
  connectionText: { fontSize: 10, color: Colors.textMuted },
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
