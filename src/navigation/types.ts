export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
};

export type RestaurantTabParamList = {
  RestaurantOrders: undefined;
  RestaurantTracking: undefined;
  RestaurantProfile: undefined;
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
