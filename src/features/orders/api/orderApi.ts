import { apiClient } from '../../../services/api/client';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface OrderItemDto {
  id: string;
  marketProductId: string;
  productName: string;
  marketName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDto {
  id: string;
  orderId?: string;
  restaurantId: string;
  restaurantName?: string;
  status: OrderStatus;
  orderGroupId: string | null;
  scheduledOrderId: string | null;
  items: OrderItemDto[];
  totalAmount: number;
  scheduledFor: string | null;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItemDto {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  scheduledFor: string | null;
  createdAt: string;
}

export interface OrderListMeta {
  pageSize: number;
  nextCursor: string | null;
}

export interface CreateOrderPayload {
  items: { marketProductId: string; quantity: number; note?: string }[];
  scheduledFor?: string;
  notes?: string;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  ready_for_pickup: 'Sẵn sàng lấy hàng',
  in_transit: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  processing: '#8B5CF6',
  ready_for_pickup: '#06B6D4',
  in_transit: '#F97316',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

export const orderApi = {
  async create(payload: CreateOrderPayload): Promise<OrderDto> {
    const { data } = await apiClient.post<OrderDto>('/api/v1/orders', payload);
    return data;
  },

  async list(params?: {
    status?: OrderStatus;
    from?: string;
    to?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<{ data: OrderListItemDto[]; meta: OrderListMeta }> {
    const { data } = await apiClient.get<{ data: OrderListItemDto[]; meta: OrderListMeta }>(
      '/api/v1/orders',
      { params },
    );
    return data;
  },

  async getById(orderId: string): Promise<OrderDto> {
    const { data } = await apiClient.get<OrderDto>(`/api/v1/orders/${orderId}`);
    return data;
  },

  async cancel(
    orderId: string,
    reason?: string,
  ): Promise<{ id: string; status: string; cancelledAt: string; cancellationReason: string | null }> {
    const { data } = await apiClient.patch(`/api/v1/orders/${orderId}/cancel`, { reason });
    return data;
  },
};
