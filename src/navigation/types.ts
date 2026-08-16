import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HubInboundTask } from '../features/hub/api/hubApi';
import type { MarketProductTagDto, SellingUnitDto } from '../types/api.types';

export type RootStackParamList = {
  RoleHome: any;
  Notifications: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { identifier?: string };
  VerifyEmail: { email: string };
};

export type RestaurantTabParamList = {
  RestaurantOrders: NavigatorScreenParams<RestaurantOrdersStackParamList> | undefined;
  RestaurantFavorites: NavigatorScreenParams<RestaurantFavoritesStackParamList> | undefined;
  RestaurantAssistant: NavigatorScreenParams<RestaurantAssistantStackParamList> | undefined;
  RestaurantTracking: NavigatorScreenParams<RestaurantOrdersStackParamList> | undefined;
  RestaurantProfile: undefined;
};

export type RestaurantFavoritesStackParamList = {
  Favorites: undefined;
  ProductDetail: {
    product: {
      marketProductId: string;
      productId: string;
      productName: string;
      imageUrl: string | null;
      marketId: string;
      marketName: string;
      category: string | null;
      unit: string;
      currentPrice: number;
      availableQuantity: number;
      tags: MarketProductTagDto[];
      description?: string | null;
      /** Optional — see `ProductDetailScreen.tsx`'s `RouteParams.product` doc comment. */
      sellingUnit?: SellingUnitDto | null;
    };
  };
};

export type RestaurantAssistantStackParamList = {
  AssistantChat: undefined;
  DeliveryAddresses: undefined;
};

export type RestaurantProfileStackParamList = {
  ProfileMain: undefined;
  RestaurantProfileEdit: undefined;
  RestaurantPolicy: undefined;
  DeliveryAddresses: undefined;
  CreditOverview: undefined;
  CreditStatements: { restaurantId: string };
  Invoices: undefined;
  InvoiceDetail: { invoiceId: string };
  ClaimsList: undefined;
  OrderDetail: { orderId: string };
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
  OrderList: undefined;
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
  ClaimsList: undefined;
  CreateRecurringOrder:
    | {
        scheduledOrderId?: string;
        /** Seeds the item picker (create mode only) — from ConfirmOrderScreen's or OrderDetailScreen's "Đặt định kỳ..." button. */
        prefillItems?: { marketProductId: string; quantity: number }[];
      }
    | undefined;
  ManageRecurringOrders: undefined;
  ScheduledOrderInstances: { scheduledOrderId: string };
  DeliveryAddresses: undefined;
  ProductDetail: {
    product: {
      marketProductId: string;
      productId: string;
      productName: string;
      imageUrl: string | null;
      marketId: string;
      marketName: string;
      category: string | null;
      unit: string;
      currentPrice: number;
      availableQuantity: number;
      tags: MarketProductTagDto[];
      description?: string | null;
      /** Optional — see `ProductDetailScreen.tsx`'s `RouteParams.product` doc comment. */
      sellingUnit?: SellingUnitDto | null;
    };
  };
};

export type MarketHomeStackParamList = {
  MarketAgentHomeMain: undefined;
  MarketKiosks: { marketId: string; marketName: string };
};

export type MarketTasksStackParamList = {
  MarketAgentTasksMain: undefined;
  ProcurementTaskDetail: { batchId: string };
};

export type MarketAgentStackParamList = {
  MarketAgentHome: NavigatorScreenParams<MarketHomeStackParamList> | undefined;
  MarketAgentTasks: NavigatorScreenParams<MarketTasksStackParamList> | undefined;
  UpdatePrice: { productId?: string; marketId?: string } | undefined;
  MarketAgentProfile: undefined;
};

export type HubTabParamList = {
  HubDashboard: undefined;
  InboundQueue: undefined;
  HubProfile: undefined;
};

export type HubStackParamList = {
  HubTabs: NavigatorScreenParams<HubTabParamList> | undefined;
  HubProcurementWeek: undefined;
  HubBatchOrders: { hubId: string; hubName: string; date: string; batchId: string };
  MarketDispatch: undefined;
  CheckIn: { batchId: string; assignedTask?: HubInboundTask };
  QualityCheck: { batchId: string };
  DriverHandoff: { routeId: string; hubId: string };
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
