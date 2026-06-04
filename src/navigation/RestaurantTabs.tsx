import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { PriceListScreen } from '../features/pricing/screens/PriceListScreen';
import { TrackOrderScreen } from '../features/delivery/screens/TrackOrderScreen';
import { type RestaurantTabParamList } from './types';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<RestaurantTabParamList>();

const TAB_ICON = {
  RestaurantOrders: { focused: 'clipboard', unfocused: 'clipboard-outline' },
  RestaurantPricing: { focused: 'trending-up', unfocused: 'trending-up-outline' },
  RestaurantTracking: { focused: 'locate', unfocused: 'locate-outline' },
} as const;

export function RestaurantTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICON[route.name as keyof typeof TAB_ICON];
          return (
            <Ionicons
              name={focused ? icons.focused : icons.unfocused}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
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
