import { createContext, useContext } from 'react';

export interface CartItem {
  id: string; // marketProductId
  name: string; // productName
  market: string; // marketName
  unit: string;
  price: number; // currentPrice
  qty: number;
  image: string;
  note?: string;
}

export interface CartStore {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: {
    id: string;
    name: string;
    market: string;
    unit: string;
    price: number;
    image: string;
  }) => void;
  removeFromCart: (itemId: string) => void;
  updateItemQty: (itemId: string, qty: number) => void;
  updateItemNote: (itemId: string, note: string) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartStore | null>(null);

export function useCartStore(): CartStore {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartStore must be inside CartProvider');
  return ctx;
}
