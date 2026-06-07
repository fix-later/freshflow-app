export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type RestaurantTabParamList = {
  RestaurantOrders: undefined;
  RestaurantPricing: undefined;
  RestaurantTracking: undefined;
};

export type MarketAgentStackParamList = {
  MarketAgentHome: undefined;
  MarketAgentInventory: undefined;
  UpdatePrice: { productId?: string } | undefined;
};

export type HubStackParamList = {
  HubDashboard: undefined;
  CheckIn: undefined;
  Sorting: undefined;
};

export type DriverStackParamList = {
  DriverHome: undefined;
  StopList: { routeId: string };
  DriverNavigation: { stopId: string };
};
