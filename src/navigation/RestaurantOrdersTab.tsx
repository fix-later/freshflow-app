import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { CreateOrderScreen } from '../features/orders/screens/CreateOrderScreen';
import { ConfirmOrderScreen } from '../features/orders/screens/ConfirmOrderScreen';
import { OrderDetailScreen } from '../features/orders/screens/OrderDetailScreen';
import { OrderHistoryScreen } from '../features/orders/screens/OrderHistoryScreen';
import { ReportIssueScreen } from '../features/orders/screens/ReportIssueScreen';
import { CreateRecurringOrderScreen } from '../features/orders/screens/CreateRecurringOrderScreen';
import { ManageRecurringOrdersScreen } from '../features/orders/screens/ManageRecurringOrdersScreen';
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
        name="CreateRecurringOrder"
        component={CreateRecurringOrderScreen}
        options={{ title: 'Đặt hàng định kỳ' }}
      />
      <Stack.Screen
        name="ManageRecurringOrders"
        component={ManageRecurringOrdersScreen}
        options={{ title: 'Đơn đặt hàng định kỳ' }}
      />
    </Stack.Navigator>
  );
}
