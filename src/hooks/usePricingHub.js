import { useEffect, useRef } from 'react';
import { signalRService } from '../services/signalRService';
import { usePricingStore } from '../store/pricingStore';
import { useAuthStore } from '../store/authStore';

/**
 * Hook for Market Agent: connects to PricingHub kiosk group
 * Hook for Restaurant: connects to PricingHub market group
 */
export function usePricingHub(marketId) {
  const updatePrice = usePricingStore((s) => s.updatePrice);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !marketId) return;

    const connect = async () => {
      try {
        await signalRService.connectPricingHub({
          onPriceUpdated: (productId, mktId, newPrice, newQuantity, updatedAt) => {
            updatePrice(mktId, productId, newPrice, newQuantity, updatedAt);
          },
          onSignificantPriceAlert: (payload) => {
            // Handled by notification system — no store update needed here
            console.log('[PricingHub] SignificantPriceAlert', payload);
          },
          onReconnected: async () => {
            // Re-join market group after reconnect
            if (marketId) {
              await signalRService.joinMarketGroup(marketId);
            }
          },
        });

        await signalRService.joinMarketGroup(marketId);
        connectedRef.current = true;
      } catch (err) {
        console.warn('[usePricingHub] connect error:', err);
      }
    };

    connect();

    return () => {
      if (connectedRef.current) {
        signalRService.leaveMarketGroup(marketId).catch(() => {});
        connectedRef.current = false;
      }
    };
  }, [isAuthenticated, marketId]);
}
