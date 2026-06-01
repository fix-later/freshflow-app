import apiClient from './apiClient';

export const hubService = {
  // List all hubs (Admin only)
  async getHubs(params = {}) {
    const response = await apiClient.get('/hubs', { params });
    return response.data.data;
  },

  // Create a hub (Admin only)
  async createHub(payload) {
    const response = await apiClient.post('/hubs', payload);
    return response.data.data;
  },

  // Record inbound goods at a hub
  async recordInbound(hubId, payload) {
    const response = await apiClient.post(`/hubs/${hubId}/inbound`, payload);
    return response.data.data;
  },

  // Record outbound goods from a hub
  async recordOutbound(hubId, payload) {
    const response = await apiClient.post(`/hubs/${hubId}/outbound`, payload);
    return response.data.data;
  },

  // Get hub inventory
  async getHubInventory(hubId) {
    const response = await apiClient.get(`/hubs/${hubId}/inventory`);
    return response.data.data;
  },

  // Scan QR/barcode for inbound (Hub Staff)
  async scanInbound(hubId, payload) {
    // payload: { qrCode? | barcode? }
    const response = await apiClient.post(`/hub/scan`, payload);
    return response.data.data;
  },

  // Record discrepancy (Hub Staff)
  async recordDiscrepancy(hubId, inboundId, payload) {
    // payload: { orderItemId, affectedQuantity, conditionStatus, notes? }
    const response = await apiClient.post(
      `/hub/${hubId}/inbound/${inboundId}/discrepancy`,
      payload
    );
    return response.data.data;
  },

  // Get pending inbound deliveries (Hub Staff)
  async getPendingInbound(hubId) {
    const response = await apiClient.get(`/hub/${hubId}/pending-inbound`);
    return response.data.data;
  },
};
