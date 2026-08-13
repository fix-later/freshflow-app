import React, { useCallback, useMemo, useState } from 'react';
import { type CartItem, CartContext } from './cartStore';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  // Distinct products, not total kg — `qty` jumps by a whole case per step
  // since packing sizes landed, so summing it no longer reads as "how many
  // products" (a handful of 5kg-cased lines could already show 30+).
  const cartCount = useMemo(() => cart.length, [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const addToCart = useCallback((item: {
    id: string;
    name: string;
    market: string;
    unit: string;
    price: number;
    image: string;
    packWeightKg?: number | null;
  }) => {
    const step = item.packWeightKg && item.packWeightKg > 0 ? item.packWeightKg : 1;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + step } : c));
      }
      return [...prev, { ...item, qty: step }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (!existing) {
        return prev;
      }
      const step = existing.packWeightKg && existing.packWeightKg > 0 ? existing.packWeightKg : 1;
      if (existing.qty <= step) {
        return prev.filter((c) => c.id !== itemId);
      }
      return prev.map((c) => (c.id === itemId ? { ...c, qty: c.qty - step } : c));
    });
  }, []);

  const updateItemQty = useCallback((itemId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) {
        return prev.filter((c) => c.id !== itemId);
      }
      return prev.map((c) => (c.id === itemId ? { ...c, qty } : c));
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
