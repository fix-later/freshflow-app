import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { CreateOrderScreen } from '../features/orders/screens/CreateOrderScreen';
import { ConfirmOrderScreen } from '../features/orders/screens/ConfirmOrderScreen';
import { OrderDetailScreen } from '../features/orders/screens/OrderDetailScreen';
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
    </Stack.Navigator>
  );
}
