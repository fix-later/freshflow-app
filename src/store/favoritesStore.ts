import { createContext, useContext } from 'react';
import { type FavoriteItemDto } from '../features/orders/api/favoriteApi';

export type FavoriteItem = FavoriteItemDto;

export interface FavoritesStore {
  favorites: FavoriteItem[];
  isLoading: boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (marketProductId: string) => boolean;
  refresh: () => Promise<void>;
}

export const FavoritesContext = createContext<FavoritesStore | null>(null);

export function useFavoritesStore(): FavoritesStore {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavoritesStore must be inside FavoritesProvider');
  return ctx;
}
