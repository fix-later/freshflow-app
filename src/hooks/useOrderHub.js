import { useEffect } from 'react';
import { signalRService } from '../services/signalRService';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';

/**
 * Hook for Restaurant: connects to OrderHub and DeliveryHub
 * Listens for order status changes and delivery updates
 */
export function useOrderHub({ onOrderStatusChanged, onDeliveryStarted, onDeliveryCompleted } = {}) {
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const connect = async () => {
      try {
        await signalRService.connectOrdersHub({
          onOrderStatusChanged: (orderId, previousStatus, newStatus, changedAt, estimatedDeliveryAt) => {
            updateOrderStatus(orderId, newStatus, changedAt);
            onOrderStatusChanged?.({ orderId, previousStatus, newStatus, changedAt, estimatedDeliveryAt });
          },
          onOrderGrouped: (orderGroupId, orderId, changedAt) => {
            console.log('[OrderHub] OrderGrouped', { orderGroupId, orderId, changedAt });
          },
          onPaymentFailed: (orderId) => {
            console.log('[OrderHub] PaymentFailed', orderId);
          },
        });

        await signalRService.connectDeliveryHub({
          onDeliveryStarted: (payload) => {
            onDeliveryStarted?.(payload);
          },
          onDeliveryCompleted: (payload) => {
            onDeliveryCompleted?.(payload);
          },
          onDeliveryStatusChanged: (scheduleId, newStatus, updatedAt) => {
            console.log('[DeliveryHub] DeliveryStatusChanged', { scheduleId, newStatus, updatedAt });
          },
          onHubDiscrepancy: (payload) => {
            console.log('[DeliveryHub] HubDiscrepancyNotification', payload);
          },
        });
      } catch (err) {
        console.warn('[useOrderHub] connect error:', err);
      }
    };

    connect();

    return () => {
      signalRService.disconnectOrdersHub().catch(() => {});
      signalRService.disconnectDeliveryHub().catch(() => {});
    };
  }, [isAuthenticated]);
}
