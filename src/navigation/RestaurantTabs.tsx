import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { OrderListScreen } from '../features/orders/screens/OrderListScreen';
import { PriceListScreen } from '../features/pricing/screens/PriceListScreen';
import { TrackOrderScreen } from '../features/delivery/screens/TrackOrderScreen';
import { type RestaurantTabParamList } from './types';
import { Colors } from '../constants/colors';
import { LogoutButton } from '../components/ui/LogoutButton';

const Tab = createBottomTabNavigator<RestaurantTabParamList>();

const TAB_CONFIG = {
  RestaurantOrders: { label: 'Chợ', icon: 'storefront-outline' as const, activeIcon: 'storefront' as const },
  RestaurantPricing: { label: 'Mua hàng', icon: 'cart-outline' as const, activeIcon: 'cart' as const },
  RestaurantTracking: { label: 'Giao hàng', icon: 'car-outline' as const, activeIcon: 'car' as const },
} as const;

export function RestaurantTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerRight: () => <LogoutButton />,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarIcon: ({ focused, size }) => {
          const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
          return (
            <View
              style={{
                width: 56,
                height: 32,
                borderRadius: 12,
                backgroundColor: focused ? 'rgba(0,107,44,0.12)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={focused ? config.activeIcon : config.icon}
                size={focused ? size + 1 : size}
                color={focused ? Colors.primary : Colors.onSurfaceVariant}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="RestaurantOrders"
        component={OrderListScreen}
        options={{ title: 'Chợ' }}
      />
      <Tab.Screen
        name="RestaurantPricing"
        component={PriceListScreen}
        options={{ title: 'Mua hàng' }}
      />
      <Tab.Screen
        name="RestaurantTracking"
        component={TrackOrderScreen}
        options={{ title: 'Giao hàng' }}
      />
    </Tab.Navigator>
  );
}
