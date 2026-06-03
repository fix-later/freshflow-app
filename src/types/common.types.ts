import { type OrderStatus } from '../constants/orderStatus';
import { type UserRole } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  currentPrice: number;
  imageUrl?: string;
  category?: string;
}

export interface PriceUpdate {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  updatedAt: string;
  kioskId: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStop {
  id: string;
  orderId: string;
  restaurantName: string;
  address: string;
  lat: number;
  lng: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
}

export interface Route {
  id: string;
  driverId?: string;
  driverName?: string;
  stops: DeliveryStop[];
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  kioskId: string;
}

export interface HubBatch {
  id: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
  }>;
  receivedAt: string;
  status: 'RECEIVED' | 'SORTED';
}
