import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import { ENV, isDev } from '../../../config/env';
import { TOKEN_KEY } from '../../../services/api/client';
import { type OrderStatus } from '../api/orderApi';

export interface OrderStatusChangedEvent {
  orderId: string;
  restaurantId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedAt: string;
  estimatedDeliveryAt: string | null;
}

const ORDER_STATUSES = new Set<OrderStatus>([
  'draft',
  'confirmed',
  'batched',
  'picked_up',
  'at_hub',
  'delivering',
  'delivered',
  'cancelled',
]);

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && ORDER_STATUSES.has(value as OrderStatus);
}

function isOrderStatusChangedEvent(value: unknown): value is OrderStatusChangedEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<OrderStatusChangedEvent>;
  return (
    typeof event.orderId === 'string'
    && typeof event.restaurantId === 'string'
    && isOrderStatus(event.previousStatus)
    && isOrderStatus(event.newStatus)
    && typeof event.changedAt === 'string'
  );
}

export function createOrderStatusConnection(
  onStatusChanged: (event: OrderStatusChangedEvent) => void,
): HubConnection {
  const hubBaseUrl = ENV.SIGNALR_URL.replace(/\/+$/, '');
  const connection = new HubConnectionBuilder()
    .withUrl(`${hubBaseUrl}/orders`, {
      accessTokenFactory: async () => (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '',
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(isDev ? LogLevel.Warning : LogLevel.Error)
    .build();

  connection.on('OrderStatusChanged', (payload: unknown) => {
    if (isOrderStatusChangedEvent(payload)) onStatusChanged(payload);
  });

  return connection;
}
