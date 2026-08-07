import { apiClient, getCursorPaged } from '../../../services/api/client';
import type {
  MarketDto,
  MarketProductDto,
  CategoryDto,
  PriceHistoryItemDto,
  ProductDto,
  PaginationMeta,
  TagDto,
} from '../../../types/api.types';

export interface GetMarketProductsParams {
  category?: string;
  cursor?: string;
  pageSize?: number;
  tag?: string;
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

  /** GET /api/v1/tags — live tag catalog used by the Restaurant product board. */
  async getTags(): Promise<TagDto[]> {
    const { data } = await apiClient.get<TagDto[]>('/api/v1/tags');
    return data;
  },

  /** GET /api/v1/products — product metadata including description and image. */
  async getProducts(params?: {
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: ProductDto[]; meta: PaginationMeta }> {
    const { data } = await apiClient.get<{ data: ProductDto[]; meta: PaginationMeta }>(
      '/api/v1/products',
      {
        params: {
          ...params,
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 100,
        },
      },
    );
    return data;
  },

  /**
   * GET /api/v1/markets/{marketId}/products
   * Returns active products at a market with current price & stock.
   * Cursor-paginated; optionally filtered by category or exact tag name.
   */
  async getMarketProducts(
    marketId: string,
    params?: GetMarketProductsParams,
  ): Promise<MarketProductsResponse> {
    const result = await getCursorPaged<MarketProductDto>(
      `/api/v1/markets/${marketId}/products`,
      {
        params: {
          category: params?.category,
          cursor: params?.cursor,
          pageSize: params?.pageSize ?? 50,
          tag: params?.tag,
        },
      },
    );
    return {
      items: result.data,
      nextCursor: result.meta.nextCursor,
      pageSize: result.meta.pageSize,
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
    const result = await getCursorPaged<PriceHistoryItemDto>(
      `/api/v1/markets/${marketId}/products/${productId}/price-history`,
      {
        params: {
          cursor: params?.cursor,
          pageSize: params?.pageSize ?? 10,
          from: params?.from,
          to: params?.to,
        },
      },
    );
    return {
      items: result.data,
      nextCursor: result.meta.nextCursor,
      pageSize: result.meta.pageSize,
    };
  },
};
