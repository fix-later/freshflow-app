import { apiClient } from '../../../services/api/client';

/**
 * Mirrors backend `FavoriteItemDto` exactly (RestaurantFavoritesController /
 * GetFavoritesQueryHandler in FreshFlow.Orders.Application) — already enriched
 * server-side, no follow-up request needed to render a favorite card.
 */
export interface FavoriteItemDto {
  marketProductId: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  marketId: string;
  marketName: string;
  category: string | null;
  unit: string;
  packingCodeId?: string | null;
  weightKg?: number | null;
  minimumOrderQuantity?: number;
  currentPrice: number;
  availableQuantity: number;
  createdAt: string;
}

/**
 * Restaurant favorites (wishlist) — role = restaurant only. Add/remove are
 * idempotent server-side: favoriting twice or un-favoriting twice both succeed.
 */
export const favoriteApi = {
  /** GET /api/v1/restaurants/me/favorites */
  async list(): Promise<FavoriteItemDto[]> {
    const { data } = await apiClient.get<FavoriteItemDto[]>('/api/v1/restaurants/me/favorites');
    return data;
  },

  /** POST /api/v1/restaurants/me/favorites */
  async add(marketProductId: string): Promise<{ marketProductId: string }> {
    const { data } = await apiClient.post<{ marketProductId: string }>(
      '/api/v1/restaurants/me/favorites',
      { marketProductId },
    );
    return data;
  },

  /** DELETE /api/v1/restaurants/me/favorites/{marketProductId} */
  async remove(marketProductId: string): Promise<void> {
    await apiClient.delete(`/api/v1/restaurants/me/favorites/${marketProductId}`);
  },
};
