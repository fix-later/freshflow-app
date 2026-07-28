import React, { useCallback, useEffect, useState } from 'react';
import { favoriteApi } from '../features/orders/api/favoriteApi';
import { UserRole } from '../constants/roles';
import { useAuthStore } from './authStore';
import { type FavoriteItem, FavoritesContext } from './favoritesStore';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || user?.role !== UserRole.RESTAURANT) {
      setFavorites([]);
      return;
    }
    setIsLoading(true);
    try {
      setFavorites(await favoriteApi.list());
    } catch {
      // Keep the previous list on a transient failure — nothing to reconcile here.
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = useCallback(
    (marketProductId: string) => favorites.some((item) => item.marketProductId === marketProductId),
    [favorites],
  );

  // Fire-and-forget with optimistic update + rollback, so callers (heart-icon taps)
  // don't need to await — matches the previous local-only store's synchronous API.
  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      const wasFavorite = favorites.some((x) => x.marketProductId === item.marketProductId);

      setFavorites((prev) =>
        wasFavorite
          ? prev.filter((x) => x.marketProductId !== item.marketProductId)
          : [...prev, item],
      );

      const request = wasFavorite
        ? favoriteApi.remove(item.marketProductId)
        : favoriteApi.add(item.marketProductId);

      request.catch(() => {
        setFavorites((prev) =>
          wasFavorite
            ? [...prev, item]
            : prev.filter((x) => x.marketProductId !== item.marketProductId),
        );
      });
    },
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isLoading, toggleFavorite, isFavorite, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}
