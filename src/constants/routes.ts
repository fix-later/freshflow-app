export const Routes = {
  // Auth
  LOGIN:    'Login',
  REGISTER: 'Register',

  // Restaurant
  RESTAURANT_ORDERS:   'RestaurantOrders',
  RESTAURANT_PRICING:  'RestaurantPricing',
  RESTAURANT_TRACKING: 'RestaurantTracking',

  // Market Agent
  MARKET_AGENT_HOME:         'MarketAgentHome',
  MARKET_AGENT_INVENTORY:    'MarketAgentInventory',
  MARKET_AGENT_UPDATE_PRICE: 'UpdatePrice',

  // Hub Staff
  HUB_DASHBOARD: 'HubDashboard',
  HUB_CHECKIN:   'CheckIn',
  HUB_SORTING:   'Sorting',

  // Driver
  DRIVER_HOME:       'DriverHome',
  DRIVER_STOP_LIST:  'StopList',
  DRIVER_NAVIGATION: 'DriverNavigation',

  // Shared
  ORDER_DETAIL:  'OrderDetail',
  CREATE_ORDER:  'CreateOrder',
  NOTIFICATIONS: 'Notifications',
} as const;
