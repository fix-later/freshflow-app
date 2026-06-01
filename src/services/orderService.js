import apiClient from './apiClient';

export const orderService = {
  // Create a bulk order (Restaurant only)
  async createOrder(payload) {
    // payload: { items: [{marketProductId, quantity}], scheduledFor?, notes? }
    const response = await apiClient.post('/orders', payload);
    return response.data.data;
  },

  // List orders (Restaurant: own; Admin: all)
  async getOrders(params = {}) {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  // Get order detail
  async getOrder(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data.data;
  },

  // Cancel an order
  async cancelOrder(orderId, reason = '') {
    const response = await apiClient.patch(`/orders/${orderId}/cancel`, { reason });
    return response.data.data;
  },

  // Update order status (Admin only)
  async updateOrderStatus(orderId, status) {
    const response = await apiClient.patch(`/orders/${orderId}/status`, { status });
    return response.data.data;
  },

  // List scheduled orders (Restaurant only)
  async getScheduledOrders(params = {}) {
    const response = await apiClient.get('/orders/scheduled', { params });
    return response.data;
  },

  // Create scheduled order (Restaurant only)
  async createScheduledOrder(payload) {
    const response = await apiClient.post('/orders/scheduled', payload);
    return response.data.data;
  },

  // List order groups (Admin only)
  async getOrderGroups(params = {}) {
    const response = await apiClient.get('/order-groups', { params });
    return response.data;
  },

  // Create order group (Admin only)
  async createOrderGroup(payload) {
    const response = await apiClient.post('/order-groups', payload);
    return response.data.data;
  },
};
