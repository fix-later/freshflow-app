import { createNavigationContainerRef } from '@react-navigation/native';
import type { UserRole } from '../../../constants/roles';
import type { RootStackParamList } from '../../../navigation/types';

export interface NotificationNavigationInput {
  notificationId?: string;
  type: string;
  payload: unknown;
}

interface PendingNavigation {
  input: NotificationNavigationInput;
  role: UserRole;
}

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNavigation: PendingNavigation | null = null;
let pendingInbox = false;

export function parseNotificationPayload(
  payload: NotificationNavigationInput['payload'],
): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload !== 'string') return {};

  try {
    const parsed: unknown = JSON.parse(payload);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function semanticString(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function canNavigateAuthenticated(): boolean {
  if (!navigationRef.isReady()) return false;
  return navigationRef.getRootState().routeNames.includes('RoleHome');
}

export function openNotificationInbox(): void {
  if (!canNavigateAuthenticated()) {
    pendingInbox = true;
    return;
  }
  navigationRef.navigate('Notifications');
}

export function navigateFromNotification(
  input: NotificationNavigationInput,
  role: UserRole,
): void {
  if (!canNavigateAuthenticated()) {
    pendingNavigation = { input, role };
    return;
  }

  const payload = parseNotificationPayload(input.payload);
  const orderId = semanticString(payload, 'order_id', 'orderId');
  const scheduledOrderId = semanticString(payload, 'scheduled_order_id', 'scheduledOrderId');
  const deliveryId = semanticString(payload, 'delivery_id', 'deliveryId');
  const routeId = semanticString(payload, 'route_id', 'routeId');
  const batchId = semanticString(payload, 'batch_id', 'batchId');

  if (role === 'RESTAURANT') {
    if (scheduledOrderId && input.type === 'system') {
      navigationRef.navigate('RoleHome', {
        screen: 'RestaurantTracking',
        params: {
          screen: 'ScheduledOrderInstances',
          params: { scheduledOrderId },
        },
      });
      return;
    }

    if (orderId) {
      navigationRef.navigate('RoleHome', {
        screen: 'RestaurantTracking',
        params: { screen: 'OrderDetail', params: { orderId } },
      });
      return;
    }

    if (input.type === 'credit_alert' || input.type === 'credit_statement') {
      navigationRef.navigate('RoleHome', {
        screen: 'RestaurantProfile',
        params: { screen: 'CreditOverview' },
      });
      return;
    }
  }

  if (role === 'DRIVER') {
    if (deliveryId) {
      navigationRef.navigate('RoleHome', {
        screen: 'DriverNavigation',
        params: { deliveryId },
      });
      return;
    }
    if (routeId) {
      navigationRef.navigate('RoleHome', {
        screen: 'StopList',
        params: { routeId },
      });
      return;
    }
  }

  if (role === 'MARKET_AGENT' && batchId) {
    navigationRef.navigate('RoleHome', {
      screen: 'MarketAgentTasks',
      params: {
        screen: 'ProcurementTaskDetail',
        params: { batchId },
      },
    });
    return;
  }

  if (role === 'HUB_STAFF' && batchId) {
    navigationRef.navigate('RoleHome', {
      screen: 'CheckIn',
      params: { batchId },
    });
    return;
  }

  // Unknown types stay useful and safe: show the source-of-truth inbox rather
  // than trusting an arbitrary screen name supplied by a remote payload.
  openNotificationInbox();
}

export function flushPendingNotificationNavigation(): void {
  if (!canNavigateAuthenticated()) return;

  if (pendingNavigation) {
    const pending = pendingNavigation;
    pendingNavigation = null;
    navigateFromNotification(pending.input, pending.role);
    return;
  }

  if (pendingInbox) {
    pendingInbox = false;
    openNotificationInbox();
  }
}
