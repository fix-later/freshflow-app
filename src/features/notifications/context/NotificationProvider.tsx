import type { PropsWithChildren } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import * as Notifications from 'expo-notifications';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { useAuthStore } from '../../../store/authStore';
import { notificationApi, type NotificationDto } from '../api/notificationApi';
import {
  navigateFromNotification,
  type NotificationNavigationInput,
} from '../navigation/notificationNavigation';
import { createNotificationConnection } from '../realtime/notificationRealtime';
import {
  ensureLocalNotificationPermission,
  presentLocalNotification,
} from '../services/localNotification';
import { NotificationContext } from './NotificationContext';

function newestFirst(items: NotificationDto[]): NotificationDto[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function dataString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user, token, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [toast, setToast] = useState<NotificationDto | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const knownIdsRef = useRef(new Set<string>());

  accountIdRef.current = user?.id ?? null;

  const syncInbox = useCallback(async (showRefresh = false) => {
    const accountId = user?.id;
    if (!accountId) return;

    if (showRefresh) setRefreshing(true);
    else if (knownIdsRef.current.size === 0) setLoading(true);

    try {
      const page = await notificationApi.list({ pageSize: 50 });
      if (accountIdRef.current !== accountId) return;

      knownIdsRef.current = new Set(page.data.map((item) => item.id));
      setNotifications(newestFirst(page.data));
      setNextCursor(page.meta.nextCursor);
      setError(null);
    } catch {
      if (accountIdRef.current === accountId) {
        setError('Không thể tải thông báo. Vui lòng thử lại.');
      }
    } finally {
      if (accountIdRef.current === accountId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id]);

  const loadMore = useCallback(async () => {
    const accountId = user?.id;
    if (!accountId || !nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const page = await notificationApi.list({ cursor: nextCursor, pageSize: 50 });
      if (accountIdRef.current !== accountId) return;

      setNotifications((current) => {
        const ids = new Set(current.map((item) => item.id));
        const incoming = page.data.filter((item) => !ids.has(item.id));
        incoming.forEach((item) => knownIdsRef.current.add(item.id));
        return [...current, ...incoming];
      });
      setNextCursor(page.meta.nextCursor);
    } catch {
      if (accountIdRef.current === accountId) {
        setError('Không thể tải thêm thông báo.');
      }
    } finally {
      if (accountIdRef.current === accountId) setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, user?.id]);

  const markRead = useCallback(async (item: NotificationDto) => {
    if (item.isRead) return;

    setNotifications((current) => current.map((notification) => (
      notification.id === item.id ? { ...notification, isRead: true } : notification
    )));

    try {
      const updated = await notificationApi.markRead(item.id);
      setNotifications((current) => current.map((notification) => (
        notification.id === item.id ? updated : notification
      )));
    } catch {
      setNotifications((current) => current.map((notification) => (
        notification.id === item.id ? item : notification
      )));
    }
  }, []);

  const routeInput = useCallback((input: NotificationNavigationInput) => {
    if (user) navigateFromNotification(input, user.role);
  }, [user]);

  const openNotification = useCallback(async (item: NotificationDto) => {
    const markReadPromise = markRead(item);
    routeInput({ notificationId: item.id, type: item.type, payload: item.payload });
    await markReadPromise;
  }, [markRead, routeInput]);

  const acceptRealtimeNotification = useCallback((item: NotificationDto) => {
    if (knownIdsRef.current.has(item.id)) return;
    knownIdsRef.current.add(item.id);
    setNotifications((current) => newestFirst([item, ...current]));

    const accountId = accountIdRef.current;
    void presentLocalNotification(item).then((presented) => {
      // Permission may be denied or local notification APIs may be unavailable
      // (for example on web). Keep the existing in-app toast as a fallback.
      if (!presented && accountIdRef.current === accountId) setToast(item);
    });

    // SignalR is an invalidation/latency channel. Reconcile immediately with
    // the REST inbox, which remains the source of truth.
    void syncInbox(false);
  }, [syncInbox]);

  useEffect(() => {
    knownIdsRef.current.clear();
    setNotifications([]);
    setNextCursor(null);
    setError(null);
    setToast(null);

    if (isAuthenticated && user) void syncInbox(false);
  }, [isAuthenticated, syncInbox, user?.id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      void ensureLocalNotificationPermission().catch((error) => {
        console.warn('Unable to request local notification permission:', error);
      });
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user || !token) return;

    const connection = createNotificationConnection(acceptRealtimeNotification);
    let disposed = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleInitialRetry = () => {
      if (disposed || retryTimeout) return;
      retryTimeout = setTimeout(() => {
        retryTimeout = null;
        void start();
      }, 5_000);
    };

    const start = async () => {
      if (disposed || connection.state !== HubConnectionState.Disconnected) return;
      try {
        await connection.start();
        if (!disposed) setRealtimeConnected(true);
      } catch (startError) {
        if (!disposed) {
          setRealtimeConnected(false);
          console.warn('Notification SignalR connection failed:', startError);
          scheduleInitialRetry();
        }
      }
    };

    connection.onreconnecting(() => setRealtimeConnected(false));
    connection.onreconnected(() => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      setRealtimeConnected(true);
      void syncInbox(false);
    });
    connection.onclose(() => {
      setRealtimeConnected(false);
      scheduleInitialRetry();
    });

    void start();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncInbox(false);
        void start();
      }
    });

    return () => {
      disposed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      appStateSubscription.remove();
      setRealtimeConnected(false);
      void connection.stop();
    };
  }, [acceptRealtimeNotification, isAuthenticated, syncInbox, token, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const notificationId = dataString(data, 'notificationId');
      const type = dataString(data, 'type') ?? 'system';

      if (notificationId) {
        void notificationApi
          .markRead(notificationId)
          .then(() => syncInbox(false))
          .catch(() => undefined);
      }

      routeInput({
        notificationId: notificationId ?? undefined,
        type,
        payload: data.payload,
      });
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      handleResponse(lastResponse);
      Notifications.clearLastNotificationResponse();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [isAuthenticated, routeInput, syncInbox, user?.id]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(() => setToast(null), 4_500);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0),
    [notifications],
  );

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    nextCursor,
    loading,
    refreshing,
    loadingMore,
    error,
    realtimeConnected,
    syncInbox,
    loadMore,
    markRead,
    openNotification,
  }), [
    error,
    loadMore,
    loading,
    loadingMore,
    markRead,
    nextCursor,
    notifications,
    openNotification,
    realtimeConnected,
    refreshing,
    syncInbox,
    unreadCount,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mở thông báo: ${toast.title}`}
            style={styles.toast}
            onPress={() => {
              setToast(null);
              void openNotification(toast);
            }}
          >
            <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
            <Text style={styles.toastBody} numberOfLines={2}>{toast.body}</Text>
          </Pressable>
        ) : null}
      </View>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  toastTitle: { color: Colors.deepTeal, fontFamily: Fonts.semibold, fontSize: 14 },
  toastBody: { marginTop: 3, color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
