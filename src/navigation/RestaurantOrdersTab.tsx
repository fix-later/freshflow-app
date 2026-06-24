import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { CreateOrderScreen } from '../features/orders/screens/CreateOrderScreen';
import { ConfirmOrderScreen } from '../features/orders/screens/ConfirmOrderScreen';
import { OrderDetailScreen } from '../features/orders/screens/OrderDetailScreen';
import { OrderHistoryScreen } from '../features/orders/screens/OrderHistoryScreen';
import { ReportIssueScreen } from '../features/orders/screens/ReportIssueScreen';
import { CreateRecurringOrderScreen } from '../features/orders/screens/CreateRecurringOrderScreen';
import { type RestaurantOrdersStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantOrdersStackParamList>();

export function RestaurantOrdersTab() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="OrderList"
        component={OrderListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: 'Tạo đơn hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ConfirmOrder"
        component={ConfirmOrderScreen}
        options={{ title: 'Xác nhận đơn hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Chi tiết đơn hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'Lịch sử đơn hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ title: 'Báo sự cố', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreateRecurringOrder"
        component={CreateRecurringOrderScreen}
        options={{ title: 'Đặt hàng định kỳ', animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
