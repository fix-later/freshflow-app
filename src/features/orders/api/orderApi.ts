import { apiClient } from '../../../services/api/client';

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'batched'
  | 'picked_up'
  | 'at_hub'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export type OrderPaymentStatus =
  | 'not_applicable'
  | 'outstanding'
  | 'settled'
  | 'waived';

export interface OrderItemDto {
  orderItemId: string;
  marketProductId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  actualQuantity: number | null;
  /**
   * Only populated by GET /orders/{id} (backend enriches via IMarketProductImageReader
   * there only) — every other endpoint that returns an OrderDto (create/update/remove
   * item, confirm, cancel, confirmReceipt, reorder) leaves this null.
   */
  imageUrl: string | null;
  // Set once the hub records actual delivered quantity — may differ from unitPrice
  // if pricing was re-locked at delivery time. Null until then.
  actualUnitPrice: number | null;
  vatRateCode: string | null;
  vatRatePercent: number | null;
  vatAmount: number | null;
}

/** Snapshot of the delivery address captured at order confirmation time — null on a draft. */
export interface DeliveryAddressSnapshotDto {
  addressId: string;
  recipientName: string | null;
  phone: string | null;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
}

/** GET /api/v1/orders/ordering-window — admin-configurable cutoff time + delivery window. */
export interface OrderingWindowDto {
  dailyCutoffTime: string;
  deliveryWindowDays: number;
}

/** Fallback used only until `orderApi.getOrderingWindow()` resolves — matches the backend's seed. */
export const DEFAULT_DELIVERY_WINDOW_DAYS = 7;

export interface OrderDto {
  orderId: string;
  restaurantId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
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
  // Null until the order is confirmed (backend captures the snapshot at confirm time).
  deliveryAddress: DeliveryAddressSnapshotDto | null;
  // BE record fields have C# default values (= 0m), so these are always present as
  // real numbers on the wire — never null/missing — regardless of order status.
  subtotalAmount: number;
  vatAmount: number;
  deliveryFee: number;
  deliveryDistanceKm: number;
}

export interface OrderListItemDto {
  orderId: string;
  restaurantId: string;
  orderGroupId: string | null;
  scheduledOrderId: string | null;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  totalAmount: number;
  itemCount: number;
  scheduledFor: string | null;
  createdAt: string;
}

export interface OrderListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderPayload {
  items: { marketProductId: string; quantity: number }[];
  scheduledFor?: string;
  notes?: string;
}

export interface ReorderPayload {
  scheduledFor?: string;
  notes?: string;
}

export interface OrderConfirmationPreviewIssue {
  code: string;
  message: string;
}

export interface OrderConfirmationPreviewDto {
  wouldSucceed: boolean;
  issues: OrderConfirmationPreviewIssue[];
  totalAmount: number;
  resolvedScheduledFor: string | null;
  remainingCreditAfter: number | null;
  // BE record fields have C# default values (= 0m), so these are always present as
  // real numbers on the wire — never null/missing — regardless of caller.
  subtotalAmount: number;
  vatAmount: number;
  deliveryFee: number;
  deliveryDistanceKm: number;
}

export type RecurrenceType = 'daily' | 'weekly';

export interface ScheduledOrderItemDto {
  marketProductId: string;
  quantity: number;
}

// SCRUM-386 — deliveryAddressId/items let the background job auto-confirm a real
// order from this template at each due occurrence, instead of leaving an empty draft.
export interface CreateScheduledOrderPayload {
  recurrenceType: RecurrenceType;
  firstRunAt: string;
  notes?: string;
  deliveryAddressId: string;
  items: ScheduledOrderItemDto[];
}

export interface UpdateScheduledOrderPayload {
  recurrenceType?: RecurrenceType;
  firstRunAt?: string;
  notes?: string;
  deliveryAddressId?: string;
  items?: ScheduledOrderItemDto[];
}

export interface ScheduledOrderDto {
  scheduledOrderId: string;
  restaurantId: string;
  recurrenceType: RecurrenceType;
  firstRunAt: string;
  lastExecutedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  deliveryAddressId: string | null;
  items: ScheduledOrderItemDto[];
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
  confirmed: 'Đã xác nhận',
  batched: 'Đã gom phiên thu mua',
  picked_up: 'Đã lấy tại chợ',
  at_hub: 'Đã về hub',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  draft: '#9CA3AF',
  confirmed: '#3B82F6',
  batched: '#8B5CF6',
  picked_up: '#06B6D4',
  at_hub: '#0EA5E9',
  delivering: '#F97316',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

let cachedOrderingWindow: OrderingWindowDto | null = null;
let orderingWindowPromise: Promise<OrderingWindowDto> | null = null;

export const orderApi = {
  /** GET /api/v1/orders/ordering-window — real cutoff time + delivery window (admin can change this). */
  async getOrderingWindow(): Promise<OrderingWindowDto> {
    if (cachedOrderingWindow) return cachedOrderingWindow;
    if (orderingWindowPromise) return orderingWindowPromise;

    orderingWindowPromise = apiClient
      .get<OrderingWindowDto>('/api/v1/orders/ordering-window')
      .then(({ data }) => {
        cachedOrderingWindow = data;
        return data;
      })
      .finally(() => {
        orderingWindowPromise = null;
      });

    return orderingWindowPromise;
  },

  async create(payload: CreateOrderPayload): Promise<OrderDto> {
    const { data } = await apiClient.post<OrderDto>('/api/v1/orders', payload);
    return data;
  },

  // BE requires deliveryAddressId (ConfirmOrderRequest/ConfirmOrderCommandValidator both
  // treat it as required, non-empty) — omitting it fails validation on every call.
  async confirm(orderId: string, deliveryAddressId: string): Promise<OrderDto> {
    const { data } = await apiClient.post<OrderDto>(`/api/v1/orders/${orderId}/confirm`, {
      deliveryAddressId,
    });
    return data;
  },

  // BE requires deliveryAddressId as a query param ([FromQuery] Guid, non-nullable) — omitting
  // it silently binds to Guid.Empty (missing query params on value types don't 400), so the
  // handler's address lookup always fails with DELIVERY_ADDRESS_NOT_FOUND instead of a clear error.
  async previewConfirmation(
    orderId: string,
    deliveryAddressId: string,
  ): Promise<OrderConfirmationPreviewDto> {
    const { data } = await apiClient.get<OrderConfirmationPreviewDto>(
      `/api/v1/orders/${orderId}/confirm-preview`,
      { params: { deliveryAddressId } },
    );
    return data;
  },

  async list(params?: {
    status?: OrderStatus;
    from?: string;
    to?: string;
    sort?: 'createdAt:asc' | 'createdAt:desc';
    page?: number;
    pageSize?: number;
  }): Promise<{ data: OrderListItemDto[]; meta: OrderListMeta }> {
    const { data } = await apiClient.get<{ data: OrderListItemDto[]; meta: OrderListMeta }>(
      '/api/v1/orders',
      { params },
    );
    return data;
  },

  async listHistory(params?: {
    status?: OrderStatus;
    from?: string;
    to?: string;
    sort?: 'createdAt:asc' | 'createdAt:desc';
    page?: number;
    pageSize?: number;
  }): Promise<{ data: OrderListItemDto[]; meta: OrderListMeta }> {
    const { data } = await apiClient.get<{ data: OrderListItemDto[]; meta: OrderListMeta }>(
      '/api/v1/orders/history',
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
  ): Promise<OrderDto> {
    const { data } = await apiClient.patch<OrderDto>(`/api/v1/orders/${orderId}/cancel`, { reason });
    return data;
  },

  async addItem(orderId: string, marketProductId: string, quantity: number): Promise<OrderDto> {
    const { data } = await apiClient.post<OrderDto>(`/api/v1/orders/${orderId}/items`, {
      marketProductId,
      quantity,
    });
    return data;
  },

  async updateItem(orderId: string, orderItemId: string, quantity: number): Promise<OrderDto> {
    const { data } = await apiClient.put<OrderDto>(
      `/api/v1/orders/${orderId}/items/${orderItemId}`,
      { quantity },
    );
    return data;
  },

  async removeItem(orderId: string, orderItemId: string): Promise<OrderDto> {
    const { data } = await apiClient.delete<OrderDto>(
      `/api/v1/orders/${orderId}/items/${orderItemId}`,
    );
    return data;
  },

  /** PATCH /api/v1/orders/{orderId}/receipt — only allowed once the order status is 'delivered'. */
  async confirmReceipt(orderId: string): Promise<OrderDto> {
    const { data } = await apiClient.patch<OrderDto>(`/api/v1/orders/${orderId}/receipt`);
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

  async listScheduledOrderInstances(
    scheduledOrderId: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ data: OrderListItemDto[]; meta: OrderListMeta }> {
    const { data } = await apiClient.get<{ data: OrderListItemDto[]; meta: OrderListMeta }>(
      `/api/v1/orders/scheduled/${scheduledOrderId}/instances`,
      { params },
    );
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
