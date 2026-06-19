export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
};

export type RestaurantTabParamList = {
  RestaurantOrders: undefined;
  RestaurantPricing: undefined;
  RestaurantTracking: undefined;
  RestaurantProfile: undefined;
};

export type CreateOrderItem = {
  marketProductId: string;
  productName: string;
  marketName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  image: string;
};

export type RestaurantOrdersStackParamList = {
  OrderList: undefined;
  CreateOrder: { items: CreateOrderItem[] };
  OrderDetail: { orderId: string };
};

export type MarketHomeStackParamList = {
  MarketAgentHomeMain: undefined;
  MarketKiosks: { marketId: string; marketName: string };
};

export type MarketAgentStackParamList = {
  MarketAgentHome: undefined;
  UpdatePrice: { productId?: string; marketId?: string } | undefined;
  MarketAgentProfile: undefined;
};

export type HubStackParamList = {
  HubDashboard: undefined;
  CheckIn: undefined;
  Sorting: undefined;
  HubProfile: undefined;
};

export type DriverStackParamList = {
  DriverHome: undefined;
  StopList: { routeId: string };
  DriverNavigation: { stopId: string };
  DriverProfile: undefined;
};
