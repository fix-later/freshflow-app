import { apiClient } from '../../../services/api/client';
import type { MarketProductDto, CategoryDto } from '../../../types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Response from GET /api/v1/pricing/assigned-markets */
export interface AssignedMarketDto {
  marketId: string;
  name: string;
  location: string | null;
  address: string | null;
}

/** Response from GET /api/v1/markets/{marketId}/products (paginated) */
export interface MarketProductsPage {
  items: MarketProductDto[];
  nextCursor: string | null;
  pageSize: number;
}

/** Response item from GET /api/v1/markets/{marketId}/products/{productId}/price-history */
export interface PriceHistoryEntry {
  price: number;
  quantity: number;
  recordedAt: string;
  recordedBy: string;
}

/** Cursor-paginated price history response */
export interface PriceHistoryPage {
  items: PriceHistoryEntry[];
  nextCursor: string | null;
  pageSize: number;
}

// ─── API Service ──────────────────────────────────────────────────────────────

/**
 * Market Agent API — consumed by MarketAgentHomeScreen & MarketKiosksScreen.
 * All calls go through apiClient which handles:
 *  - Authorization header injection
 *  - BE envelope unwrapping { success, data } → data
 *  - 401 token refresh
 */
export const inventoryApi = {
  /** GET /api/v1/pricing/assigned-markets — markets the agent is assigned to. */
  async getAssignedMarkets(): Promise<AssignedMarketDto[]> {
    const { data } = await apiClient.get('/api/v1/pricing/assigned-markets');
    return data;
  },

  /** GET /api/v1/categories — list all active product categories. */
  async getCategories(): Promise<CategoryDto[]> {
    const { data } = await apiClient.get('/api/v1/categories');
    return data;
  },

  /**
   * GET /api/v1/markets/{marketId}/products
   * Returns products at a specific market with current price & stock.
   * Cursor-paginated; optionally filtered by category.
   */
  async getMarketProducts(
    marketId: string,
    params?: { category?: string; cursor?: string; pageSize?: number },
  ): Promise<MarketProductsPage> {
    const queryParams: Record<string, unknown> = {};
    if (params?.category) queryParams.category = params.category;
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;

    const { data } = await apiClient.get(`/api/v1/markets/${marketId}/products`, {
      params: queryParams,
    });
    return data;
  },

  /**
   * PATCH /api/v1/markets/{marketId}/products/{productId}/price
   * Update the current price (and optionally quantity) of a market product.
   */
  async updateProductPrice(
    marketId: string,
    productId: string,
    payload: { price?: number; quantity?: number; expectedVersion?: string },
  ): Promise<void> {
    await apiClient.patch(`/api/v1/markets/${marketId}/products/${productId}/price`, payload);
  },

  /**
   * PATCH /api/v1/markets/{marketId}/products/{productId}/quantity
   * Update the available quantity of a market product.
   */
  async updateProductQuantity(
    marketId: string,
    productId: string,
    payload: { quantity: number; expectedVersion?: string },
  ): Promise<void> {
    await apiClient.patch(`/api/v1/markets/${marketId}/products/${productId}/quantity`, payload);
  },

  /**
   * GET /api/v1/markets/{marketId}/products/{productId}/price-history
   * Returns price history for a specific product at a market.
   */
  async getPriceHistory(
    marketId: string,
    productId: string,
    params?: { cursor?: string; pageSize?: number; from?: string; to?: string },
  ): Promise<PriceHistoryPage> {
    const queryParams: Record<string, unknown> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    const { data } = await apiClient.get(
      `/api/v1/markets/${marketId}/products/${productId}/price-history`,
      { params: queryParams },
    );
    return data;
  },
};
