import { createContext, useContext } from 'react';
import type { NotificationDto } from '../api/notificationApi';

export interface NotificationContextValue {
  notifications: NotificationDto[];
  unreadCount: number;
  nextCursor: string | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  realtimeConnected: boolean;
  syncInbox: (showRefresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (notification: NotificationDto) => Promise<void>;
  openNotification: (notification: NotificationDto) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider.');
  return value;
}
