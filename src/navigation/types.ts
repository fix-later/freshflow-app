import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HubInboundTask } from '../features/hub/api/hubApi';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
};

export type RestaurantTabParamList = {
  RestaurantOrders: undefined;
  RestaurantFavorites: undefined;
  RestaurantTracking: undefined;
  RestaurantProfile: undefined;
};

export type RestaurantProfileStackParamList = {
  ProfileMain: undefined;
  RestaurantProfileEdit: undefined;
  DeliveryAddresses: undefined;
  CreditOverview: undefined;
  CreditStatements: { restaurantId: string };
};

export type CreateOrderItem = {
  marketProductId: string;
  productName: string;
  marketName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  image: string;
  note?: string;
};

export type RestaurantOrdersStackParamList = {
  OrderList: { openCart?: boolean } | undefined;
  CreateOrder: { items: CreateOrderItem[] };
  ConfirmOrder: {
    items: CreateOrderItem[];
    scheduledFor?: string;
    deliveryLabel: string;
    notes?: string;
  };
  OrderDetail: { orderId: string };
  OrderHistory: undefined;
  ReportIssue: { orderId: string };
  CreateRecurringOrder: { scheduledOrderId?: string } | undefined;
  ManageRecurringOrders: undefined;
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

export type HubTabParamList = {
  HubDashboard: undefined;
  InboundQueue: undefined;
  Sorting: undefined;
  HubProfile: undefined;
};

export type HubStackParamList = {
  HubTabs: NavigatorScreenParams<HubTabParamList> | undefined;
  MarketDispatch: undefined;
  CheckIn: { batchId: string; assignedTask?: HubInboundTask };
  QualityCheck: { batchId: string };
  DriverHandoff: { routeId: string };
  IncidentReport: { batchId?: string; orderId?: string } | undefined;
};

export type DriverStackParamList = {
  DriverHome: undefined;
  PickupConfirm: { routeId: string };
  StopList: { routeId: string };
  DriverNavigation: { stopId: string };
  ProofOfDelivery: { stopId: string };
  ReportDeliveryIssue: { stopId: string };
  DriverProfile: undefined;
};
