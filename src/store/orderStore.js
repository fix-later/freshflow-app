import { create } from 'zustand';

export const useOrderStore = create((set, get) => ({
  orders: [],
  ordersMeta: null,
  currentOrder: null,
  scheduledOrders: [],

  setOrders: (orders, meta) => set({ orders, ordersMeta: meta }),

  appendOrders: (newOrders, meta) =>
    set((state) => ({
      orders: [...state.orders, ...newOrders],
      ordersMeta: meta,
    })),

  setCurrentOrder: (order) => set({ currentOrder: order }),

  setScheduledOrders: (scheduledOrders) => set({ scheduledOrders }),

  // Called by SignalR OrderStatusChanged event
  updateOrderStatus: (orderId, newStatus, changedAt) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus, updatedAt: changedAt } : o
      ),
      currentOrder:
        state.currentOrder?.id === orderId
          ? { ...state.currentOrder, status: newStatus, updatedAt: changedAt }
          : state.currentOrder,
    })),

  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),

  clearOrders: () => set({ orders: [], ordersMeta: null, currentOrder: null }),
}));
