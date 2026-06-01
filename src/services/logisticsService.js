import apiClient from './apiClient';

export const logisticsService = {
  // Calculate optimal delivery route (Admin only)
  async calculateRoute(payload) {
    // payload: { orderIds, vehicleId, routeType, optimizationCriteria? }
    const response = await apiClient.post('/routes/calculate', payload);
    return response.data.data;
  },

  // List all delivery routes (Admin only)
  async getRoutes(params = {}) {
    const response = await apiClient.get('/routes', { params });
    return response.data;
  },

  // Get route detail
  async getRoute(routeId) {
    const response = await apiClient.get(`/routes/${routeId}`);
    return response.data.data;
  },

  // Register a vehicle (Admin only)
  async createVehicle(payload) {
    const response = await apiClient.post('/vehicles', payload);
    return response.data.data;
  },

  // List all vehicles (Admin only)
  async getVehicles(params = {}) {
    const response = await apiClient.get('/vehicles', { params });
    return response.data;
  },

  // Driver: get today's assigned routes
  async getDriverRoutesToday() {
    const response = await apiClient.get('/driver/routes/today');
    return response.data.data;
  },

  // Driver: update delivery stop status
  async updateDeliveryStatus(deliveryId, status) {
    // status: 'ARRIVED' | 'DELIVERED' | 'FAILED'
    const response = await apiClient.patch(`/driver/deliveries/${deliveryId}/status`, {
      status,
    });
    return response.data.data;
  },
};
