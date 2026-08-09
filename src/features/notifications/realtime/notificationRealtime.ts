import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import { ENV, isDev } from '../../../config/env';
import { TOKEN_KEY } from '../../../services/api/client';
import type { NotificationDto } from '../api/notificationApi';

export function isNotificationDto(value: unknown): value is NotificationDto {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<NotificationDto>;
  return (
    typeof item.id === 'string'
    && typeof item.type === 'string'
    && typeof item.title === 'string'
    && typeof item.body === 'string'
    && (typeof item.payload === 'string' || item.payload === null)
    && typeof item.isRead === 'boolean'
    && (typeof item.readAt === 'string' || item.readAt === null)
    && typeof item.createdAt === 'string'
  );
}

export function createNotificationConnection(
  onCreated: (notification: NotificationDto) => void,
): HubConnection {
  const hubBaseUrl = ENV.SIGNALR_URL.replace(/\/+$/, '');
  const connection = new HubConnectionBuilder()
    .withUrl(`${hubBaseUrl}/notifications`, {
      accessTokenFactory: async () => (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '',
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(isDev ? LogLevel.Warning : LogLevel.Error)
    .build();

  connection.on('NotificationCreated', (payload: unknown) => {
    if (isNotificationDto(payload)) onCreated(payload);
  });

  return connection;
}
