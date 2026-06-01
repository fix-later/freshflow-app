import apiClient from './apiClient';

export const pricingService = {
  // List all active markets
  async getMarkets() {
    const response = await apiClient.get('/markets');
    return response.data.data;
  },

  // List products at a market with current price/quantity
  async getMarketProducts(marketId, params = {}) {
    const response = await apiClient.get(`/markets/${marketId}/products`, { params });
    return response.data;
  },

  // Get price history for a product at a market
  async getPriceHistory(marketId, productId, params = {}) {
    const response = await apiClient.get(
      `/markets/${marketId}/products/${productId}/price-history`,
      { params }
    );
    return response.data;
  },

  // Update price and/or quantity (Market Agent only)
  async updatePrice(marketId, productId, payload) {
    // payload: { price?, quantity?, expectedVersion? }
    const response = await apiClient.patch(
      `/markets/${marketId}/products/${productId}/price`,
      payload
    );
    return response.data.data;
  },

  // List all products in catalog (Admin / Market Agent)
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  // Create product (Admin only)
  async createProduct(payload) {
    const response = await apiClient.post('/products', payload);
    return response.data.data;
  },
};
