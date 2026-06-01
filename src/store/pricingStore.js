import { create } from 'zustand';

export const usePricingStore = create((set, get) => ({
  markets: [],
  // marketProducts: { [marketId]: { data: [], nextCursor: null } }
  marketProducts: {},
  // currentPrices: { [marketId]: { [productId]: { price, quantity, updatedAt } } }
  currentPrices: {},

  setMarkets: (markets) => set({ markets }),

  setMarketProducts: (marketId, data, nextCursor) =>
    set((state) => ({
      marketProducts: {
        ...state.marketProducts,
        [marketId]: { data, nextCursor },
      },
    })),

  appendMarketProducts: (marketId, newData, nextCursor) =>
    set((state) => {
      const existing = state.marketProducts[marketId]?.data ?? [];
      return {
        marketProducts: {
          ...state.marketProducts,
          [marketId]: { data: [...existing, ...newData], nextCursor },
        },
      };
    }),

  // Called by SignalR PriceUpdated event
  updatePrice: (marketId, productId, price, quantity, updatedAt) =>
    set((state) => {
      const marketPrices = state.currentPrices[marketId] ?? {};
      return {
        currentPrices: {
          ...state.currentPrices,
          [marketId]: {
            ...marketPrices,
            [productId]: { price, quantity, updatedAt },
          },
        },
        // Also update in marketProducts list if loaded
        marketProducts: state.marketProducts[marketId]
          ? {
              ...state.marketProducts,
              [marketId]: {
                ...state.marketProducts[marketId],
                data: state.marketProducts[marketId].data.map((p) =>
                  p.productId === productId
                    ? { ...p, currentPrice: price, currentQuantity: quantity, updatedAt }
                    : p
                ),
              },
            }
          : state.marketProducts,
      };
    }),

  clearMarketData: () => set({ markets: [], marketProducts: {}, currentPrices: {} }),
}));
