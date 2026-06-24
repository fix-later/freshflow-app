import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { apiClient, TOKEN_KEY } from '../../../services/api/client';
import { ENV } from '../../../config/env';
import type { MarketDto, MarketProductDto, CategoryDto, PriceHistoryItemDto } from '../../../types/api.types';

export interface GetMarketProductsParams {
  category?: string;
  cursor?: string;
  pageSize?: number;
}

export interface MarketProductsResponse {
  items: MarketProductDto[];
  nextCursor: string | null;
  pageSize: number;
}

export interface PriceHistoryResponse {
  items: PriceHistoryItemDto[];
  nextCursor: string | null;
  pageSize: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/**
 * Raw GET that preserves the full BE envelope { success, data, meta }.
 * The apiClient interceptor unwraps `data` but discards `meta`, so paginated
 * endpoints must bypass it.
 */
async function rawGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const { data } = await axios.get<T>(`${ENV.API_URL}${url}`, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
}

// ─── API Service ──────────────────────────────────────────────────────────────────

/**
 * Pricing / Catalog API — consumed by the Restaurant "Mua hàng" tab.
 * All endpoints are available to any authenticated user (role = restaurant).
 */
export const pricingApi = {
  /** GET /api/v1/markets — List all active markets. */
  async getMarkets(): Promise<MarketDto[]> {
    const { data } = await apiClient.get('/api/v1/markets');
    return data;
  },

  /** GET /api/v1/categories — List all active product categories. */
  async getCategories(): Promise<CategoryDto[]> {
    const { data } = await apiClient.get('/api/v1/categories');
    return data;
  },

  /**
   * GET /api/v1/markets/{marketId}/products
   * Returns active products at a market with current price & stock.
   * Cursor-paginated; optionally filtered by category.
   */
  async getMarketProducts(
    marketId: string,
    params?: GetMarketProductsParams,
  ): Promise<MarketProductsResponse> {
    type Raw = { success: boolean; data: MarketProductDto[]; meta: { pageSize: number; nextCursor: string | null } };
    const raw = await rawGet<Raw>(`/api/v1/markets/${marketId}/products`, {
      category: params?.category,
      cursor: params?.cursor,
      pageSize: params?.pageSize ?? 50,
    });
    return {
      items: raw.data,
      nextCursor: raw.meta?.nextCursor ?? null,
      pageSize: raw.meta?.pageSize ?? 50,
    };
  },

  /**
   * GET /api/v1/markets/{marketId}/products/{productId}/price-history
   * Used on Restaurant product detail to show recent price/stock changes.
   */
  async getPriceHistory(
    marketId: string,
    productId: string,
    params?: { cursor?: string; pageSize?: number; from?: string; to?: string },
  ): Promise<PriceHistoryResponse> {
    type Raw = { success: boolean; data: PriceHistoryItemDto[]; meta: { pageSize: number; nextCursor: string | null } };
    const raw = await rawGet<Raw>(`/api/v1/markets/${marketId}/products/${productId}/price-history`, {
      cursor: params?.cursor,
      pageSize: params?.pageSize ?? 10,
      from: params?.from,
      to: params?.to,
    });
    return {
      items: raw.data,
      nextCursor: raw.meta?.nextCursor ?? null,
      pageSize: raw.meta?.pageSize ?? 10,
    };
  },
};
