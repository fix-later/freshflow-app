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
  /**
   * How many kg one case ("kiện") of this product weighs — `qty` may only
   * ever be a whole multiple of this, since a market product is only
   * picked/shipped by the case. `null`/omitted when the source screen had no
   * selling-unit data to carry (e.g. added from Favorites, whose list
   * endpoint doesn't report it); `addToCart`/`removeFromCart` fall back to a
   * 1kg step in that case rather than blocking, since the loss is a display
   * gap, not evidence the product truly has no packing code.
   */
  packWeightKg?: number | null;
}

export interface CartStore {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  selectedMarketId: string | null;
  setSelectedMarketId: (marketId: string | null) => void;
  addToCart: (item: {
    id: string;
    name: string;
    market: string;
    unit: string;
    price: number;
    image: string;
    packWeightKg?: number | null;
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
