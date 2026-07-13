import { apiClient } from '../../../services/api/client';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface OrderItemDto {
  orderItemId: string;
  marketProductId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  actualQuantity: number | null;
}

export interface OrderDto {
  orderId: string;
  restaurantId: string;
  status: OrderStatus;
  paymentStatus: string;
  orderGroupId: string | null;
  scheduledOrderId: string | null;
  items: OrderItemDto[];
  totalAmount: number;
  scheduledFor: string | null;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  confirmedReceiptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItemDto {
  id?: string;
  orderId?: string;
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

export interface ReorderPayload {
  scheduledFor?: string;
  notes?: string;
}

export type RecurrenceType = 'daily' | 'weekly';

export interface CreateScheduledOrderPayload {
  recurrenceType: RecurrenceType;
  firstRunAt: string;
  notes?: string;
}

export type UpdateScheduledOrderPayload = CreateScheduledOrderPayload;

export interface ScheduledOrderDto {
  scheduledOrderId: string;
  restaurantId: string;
  recurrenceType: RecurrenceType;
  firstRunAt: string;
  lastExecutedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledOrderListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ScheduledOrderListResponse {
  data: ScheduledOrderDto[];
  meta: ScheduledOrderListMeta;
}

export type IssueType = 'missing' | 'wrong' | 'damaged';
export type OrderIssueStatus = 'open' | 'resolved';

export interface ReportIssuePayload {
  orderItemId: string;
  issueType: IssueType;
  affectedQuantity: number;
  description: string;
}

export interface OrderIssueDto {
  issueId: string;
  orderId: string;
  orderItemId: string | null;
  reportedBy: string;
  issueType: IssueType;
  affectedQuantity: number;
  description: string;
  status: OrderIssueStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  missing: 'Thiếu hàng',
  wrong: 'Sai hàng',
  damaged: 'Hư hỏng',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Bản nháp',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  ready_for_pickup: 'Sẵn sàng lấy hàng',
  in_transit: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  draft: '#9CA3AF',
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

  async confirm(orderId: string): Promise<OrderDto> {
    const { data } = await apiClient.post<OrderDto>(`/api/v1/orders/${orderId}/confirm`);
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

  /** PATCH /api/v1/orders/{orderId}/receipt — only allowed once the order status is 'delivered'. */
  async confirmReceipt(orderId: string): Promise<{ confirmedReceiptAt: string; status?: OrderStatus }> {
    const { data } = await apiClient.patch(`/api/v1/orders/${orderId}/receipt`);
    return data;
  },

  /** POST /api/v1/orders/{orderId}/issues — only allowed once the order status is 'delivered'. */
  async reportIssue(orderId: string, payload: ReportIssuePayload): Promise<OrderIssueDto> {
    const { data } = await apiClient.post<OrderIssueDto>(`/api/v1/orders/${orderId}/issues`, payload);
    return data;
  },

  /** POST /api/v1/orders/{orderId}/reorder — creates a new draft order from a past order's items. */
  async reorder(orderId: string, payload?: ReorderPayload): Promise<OrderDto> {
    const { data } = await apiClient.post<OrderDto>(`/api/v1/orders/${orderId}/reorder`, payload ?? {});
    return data;
  },

  /** POST /api/v1/orders/scheduled — creates a recurring scheduled order. */
  async createScheduledOrder(payload: CreateScheduledOrderPayload): Promise<ScheduledOrderDto> {
    const { data } = await apiClient.post<ScheduledOrderDto>('/api/v1/orders/scheduled', payload);
    return data;
  },

  /** GET /api/v1/orders/scheduled — lists recurring scheduled orders for the current restaurant. */
  async listScheduledOrders(params?: {
    includeCancelled?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ScheduledOrderListResponse> {
    const { data } = await apiClient.get<ScheduledOrderListResponse>('/api/v1/orders/scheduled', { params });
    return data;
  },

  /** GET /api/v1/orders/scheduled/{scheduledOrderId} — recurring schedule detail. */
  async getScheduledOrder(scheduledOrderId: string): Promise<ScheduledOrderDto> {
    const { data } = await apiClient.get<ScheduledOrderDto>(`/api/v1/orders/scheduled/${scheduledOrderId}`);
    return data;
  },

  /** PATCH /api/v1/orders/scheduled/{scheduledOrderId} — updates a recurring schedule's recurrence/notes. */
  async updateScheduledOrder(
    scheduledOrderId: string,
    payload: UpdateScheduledOrderPayload,
  ): Promise<ScheduledOrderDto> {
    const { data } = await apiClient.patch<ScheduledOrderDto>(
      `/api/v1/orders/scheduled/${scheduledOrderId}`,
      payload,
    );
    return data;
  },

  /** PATCH /api/v1/orders/scheduled/{scheduledOrderId}/cancel — cancels a recurring schedule. */
  async cancelScheduledOrder(scheduledOrderId: string): Promise<ScheduledOrderDto> {
    const { data } = await apiClient.patch<ScheduledOrderDto>(
      `/api/v1/orders/scheduled/${scheduledOrderId}/cancel`,
    );
    return data;
  },
};
