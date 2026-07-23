export const OrderStatus = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  BATCHED: 'batched',
  PICKED_UP: 'picked_up',
  AT_HUB: 'at_hub',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderStatusLabel: Record<OrderStatus, string> = {
  draft: 'Bản nháp',
  confirmed: 'Đã xác nhận',
  batched: 'Đã gom phiên thu mua',
  picked_up: 'Đã lấy tại chợ',
  at_hub: 'Đã về hub',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
  OrderStatus.BATCHED,
  OrderStatus.PICKED_UP,
  OrderStatus.AT_HUB,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];
