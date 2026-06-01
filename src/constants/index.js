// API
export const API_BASE_URL = 'https://api.freshflow.vn/api/v1';
export const SIGNALR_BASE_URL = 'https://api.freshflow.vn';

// SignalR Hub paths
export const HUB_PRICING = '/hubs/pricing';
export const HUB_ORDERS = '/hubs/orders';
export const HUB_DELIVERY = '/hubs/delivery';

// Token storage keys
export const TOKEN_KEY = 'ffx_access_token';
export const REFRESH_TOKEN_KEY = 'ffx_refresh_token';
export const USER_KEY = 'ffx_user';

// User roles
export const ROLES = {
  ADMIN: 'admin',
  MARKET_AGENT: 'market_agent',
  KIOSK_STAFF: 'kiosk_staff', // alias for market_agent
  HUB_STAFF: 'hub_staff',
  DRIVER: 'driver',
  RESTAURANT: 'restaurant',
};

// Order statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Order status labels (Vietnamese)
export const ORDER_STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  ready_for_pickup: 'Sẵn sàng lấy hàng',
  in_transit: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

// Delivery route types
export const ROUTE_TYPE = {
  MARKET_HUB_RESTAURANT: 'market_hub_restaurant',
  DIRECT: 'direct',
};

// Optimization criteria
export const OPTIMIZATION_CRITERIA = {
  DISTANCE: 'distance',
  TIME: 'time',
  COST: 'cost',
};

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;

// Cutoff time (22:00 VN time)
export const ORDER_CUTOFF_HOUR = 22;

// Significant price change thresholds
export const PRICE_SEVERITY = {
  MEDIUM: 'MEDIUM', // 5–15%
  HIGH: 'HIGH',     // >15%
};

// SignalR reconnect policy
export const SIGNALR_RECONNECT = {
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
};
