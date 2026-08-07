import React, { useCallback, useMemo, useState } from 'react';
import { type CartItem, CartContext } from './cartStore';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const addToCart = useCallback((item: {
    id: string;
    name: string;
    market: string;
    unit: string;
    packingCodeId: string | null;
    weightKg: number | null;
    minimumOrderQuantity: number;
    maxQuantity: number;
    price: number;
    image: string;
  }, quantity = 1) => {
    if (
      !item.packingCodeId
      || !item.weightKg
      || item.weightKg <= 0
      || item.minimumOrderQuantity < 1
      || item.maxQuantity < item.minimumOrderQuantity
    ) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (
          c.id === item.id
            ? { ...c, ...item, qty: Math.min(item.maxQuantity, c.qty + quantity) }
            : c
        ));
      }
      const initialQuantity = Math.min(
        item.maxQuantity,
        Math.max(item.minimumOrderQuantity, quantity),
      );
      return initialQuantity > 0 ? [...prev, { ...item, qty: initialQuantity }] : prev;
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing && existing.qty <= existing.minimumOrderQuantity) {
        return prev.filter((c) => c.id !== itemId);
      }
      return prev.map((c) => (c.id === itemId ? { ...c, qty: c.qty - 1 } : c));
    });
  }, []);

  const updateItemQty = useCallback((itemId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) {
        return prev.filter((c) => c.id !== itemId);
      }
      return prev.map((c) => (
        c.id === itemId
          ? {
              ...c,
              qty: Math.min(c.maxQuantity, Math.max(c.minimumOrderQuantity, qty)),
            }
          : c
      ));
    });
  }, []);

  const updateItemNote = useCallback((itemId: string, note: string) => {
    setCart((prev) => prev.map((c) => (c.id === itemId ? { ...c, note } : c)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        selectedMarketId,
        setSelectedMarketId,
        addToCart,
        removeFromCart,
        updateItemQty,
        updateItemNote,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
