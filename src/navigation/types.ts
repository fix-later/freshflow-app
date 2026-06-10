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

export type MarketAgentStackParamList = {
  MarketAgentHome: undefined;
  MarketAgentInventory: undefined;
  UpdatePrice: { productId?: string } | undefined;
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
