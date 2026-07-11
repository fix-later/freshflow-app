import React, { useCallback, useMemo, useState } from 'react';
import { type CartItem, CartContext } from './cartStore';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const addToCart = useCallback((item: {
    id: string;
    name: string;
    market: string;
    unit: string;
    price: number;
    image: string;
  }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing && existing.qty <= 1) {
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
