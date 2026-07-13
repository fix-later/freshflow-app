import { createContext, useContext } from 'react';

export interface FavoriteItem {
  id: string; // marketProductId or demo p1,p2...
  productId: string;
  name: string;
  marketId: string;
  marketName: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  availableQuantity: number;
  currentQuantity: number;
}

export interface FavoritesStore {
  favorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
}

export const FavoritesContext = createContext<FavoritesStore | null>(null);

export function useFavoritesStore(): FavoritesStore {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavoritesStore must be inside FavoritesProvider');
  return ctx;
}
