import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { ProductDetailScreen } from '../features/orders/screens/ProductDetailScreen';
import { CreateOrderScreen } from '../features/orders/screens/CreateOrderScreen';
import { ConfirmOrderScreen } from '../features/orders/screens/ConfirmOrderScreen';
import { OrderDetailScreen } from '../features/orders/screens/OrderDetailScreen';
import { OrderHistoryScreen } from '../features/orders/screens/OrderHistoryScreen';
import { ReportIssueScreen } from '../features/orders/screens/ReportIssueScreen';
import { ClaimsListScreen } from '../features/claims/screens/ClaimsListScreen';
import { CreateRecurringOrderScreen } from '../features/orders/screens/CreateRecurringOrderScreen';
import { ManageRecurringOrdersScreen } from '../features/orders/screens/ManageRecurringOrdersScreen';
import { ScheduledOrderInstancesScreen } from '../features/orders/screens/ScheduledOrderInstancesScreen';
import { AddDraftOrderItemScreen } from '../features/orders/screens/AddDraftOrderItemScreen';
import { RestaurantNotificationsScreen } from '../features/notifications/screens/RestaurantNotificationsScreen';
import { DeliveryAddressesScreen } from '../features/restaurant/screens/DeliveryAddressesScreen';
import { InvoiceDetailScreen } from '../features/invoices/screens/InvoiceDetailScreen';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { type RestaurantOrdersStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantOrdersStackParamList>();

const STACK_SCREEN_OPTIONS = {
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.deepTeal,
  headerTitleAlign: 'center',
  headerTitleStyle: {
    color: Colors.deepTeal,
    fontFamily: Fonts.semibold,
    fontSize: 18,
  },
} satisfies NativeStackNavigationOptions;

export function RestaurantOrdersTab() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="OrderList"
        component={OrderListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Chi tiết sản phẩm' }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: 'Tạo đơn hàng' }}
      />
      <Stack.Screen
        name="ConfirmOrder"
        component={ConfirmOrderScreen}
        options={{ title: 'Xác nhận đơn hàng' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Chi tiết đơn hàng' }}
      />
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ title: 'Chi tiết hóa đơn' }}
      />
      <Stack.Screen
        name="Notifications"
        component={RestaurantNotificationsScreen}
        options={{ title: 'Thông báo' }}
      />
      <Stack.Screen
        name="AddDraftOrderItem"
        component={AddDraftOrderItemScreen}
        options={{ title: 'Thêm sản phẩm vào bản nháp' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'Lịch sử đơn hàng' }}
      />
      <Stack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ title: 'Báo sự cố' }}
      />
      <Stack.Screen
        name="ClaimsList"
        component={ClaimsListScreen}
        options={{ title: 'Lịch sử khiếu nại đền bù' }}
      />
      <Stack.Screen
        name="CreateRecurringOrder"
        component={CreateRecurringOrderScreen}
        options={{ title: 'Đặt hàng định kỳ' }}
      />
      <Stack.Screen
        name="ManageRecurringOrders"
        component={ManageRecurringOrdersScreen}
        options={{ title: 'Đơn đặt hàng định kỳ' }}
      />
      <Stack.Screen
        name="ScheduledOrderInstances"
        component={ScheduledOrderInstancesScreen}
        options={{ title: 'Đơn đã tạo từ lịch' }}
      />
      {/* Also reachable from Profile > DeliveryAddresses — registered here too so
          "Thêm địa chỉ" from ConfirmOrder/OrderDetail pushes onto this same stack
          instead of switching tabs, letting the back button return to the order screen. */}
      <Stack.Screen
        name="DeliveryAddresses"
        component={DeliveryAddressesScreen}
        options={{ title: 'Địa chỉ giao hàng' }}
      />
    </Stack.Navigator>
  );
}
