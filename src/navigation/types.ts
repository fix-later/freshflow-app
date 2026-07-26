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
  RestaurantOrders: NavigatorScreenParams<RestaurantOrdersStackParamList> | undefined;
  RestaurantFavorites: undefined;
  RestaurantAssistant: undefined;
  RestaurantTracking: NavigatorScreenParams<RestaurantOrdersStackParamList> | undefined;
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
  TrackOrders: undefined;
  Notifications: undefined;
  OrderList: { openCart?: boolean } | undefined;
  CreateOrder: { items: CreateOrderItem[] };
  ConfirmOrder: {
    items: CreateOrderItem[];
    scheduledFor?: string;
    deliveryLabel: string;
    notes?: string;
  };
  OrderDetail: { orderId: string };
  AddDraftOrderItem: { orderId: string };
  OrderHistory: undefined;
  ReportIssue: { orderId: string };
  CreateRecurringOrder: { scheduledOrderId?: string } | undefined;
  ManageRecurringOrders: undefined;
  ScheduledOrderInstances: { scheduledOrderId: string };
};

export type MarketHomeStackParamList = {
  MarketAgentHomeMain: undefined;
  MarketKiosks: { marketId: string; marketName: string };
  ProcurementTaskDetail: { batchId: string };
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
  DriverNavigation: { deliveryId: string };
  ProofOfDelivery: { deliveryId: string };
  ReportDeliveryIssue: { deliveryId: string };
  DriverProfile: undefined;
};
