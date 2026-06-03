import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { PriceListScreen } from '../features/pricing/screens/PriceListScreen';
import { TrackOrderScreen } from '../features/delivery/screens/TrackOrderScreen';
import { type RestaurantTabParamList } from './types';

const Tab = createBottomTabNavigator<RestaurantTabParamList>();

export function RestaurantTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="RestaurantOrders"
        component={OrderListScreen}
        options={{ title: 'Đơn hàng' }}
      />
      <Tab.Screen
        name="RestaurantPricing"
        component={PriceListScreen}
        options={{ title: 'Giá thị trường' }}
      />
      <Tab.Screen
        name="RestaurantTracking"
        component={TrackOrderScreen}
        options={{ title: 'Theo dõi' }}
      />
    </Tab.Navigator>
  );
}
