import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackOrderScreen } from '../features/delivery/screens/TrackOrderScreen';
import { RestaurantProfileTab } from './RestaurantProfileTab';
import { RestaurantOrdersTab } from './RestaurantOrdersTab';
import { FavoritesScreen } from '../features/orders/screens/FavoritesScreen';
import { type RestaurantTabParamList } from './types';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<RestaurantTabParamList>();

const TAB_CONFIG = {
  RestaurantOrders: { label: 'Chợ', icon: 'storefront-outline' as const, activeIcon: 'storefront' as const },
  RestaurantFavorites: { label: 'Yêu thích', icon: 'heart-outline' as const, activeIcon: 'heart' as const },
  RestaurantTracking: { label: 'Giao hàng', icon: 'car-outline' as const, activeIcon: 'car' as const },
  RestaurantProfile: { label: 'Hồ sơ', icon: 'person-circle-outline' as const, activeIcon: 'person-circle' as const },
} as const;

export function RestaurantTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
        return {
          headerShown: true,
          tabBarLabel: config?.label,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopWidth: 0,
            elevation: 0,
            height: 64 + (insets.bottom > 0 ? insets.bottom - 8 : 0),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.onSurfaceVariant,
          tabBarIcon: ({ focused, size }) => {
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
        };
      }}
    >
      <Tab.Screen
        name="RestaurantOrders"
        component={RestaurantOrdersTab}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="RestaurantFavorites"
        component={FavoritesScreen}
        options={{ title: 'Yêu thích' }}
      />
      <Tab.Screen
        name="RestaurantTracking"
        component={TrackOrderScreen}
        options={{ title: 'Giao hàng' }}
      />
      <Tab.Screen
        name="RestaurantProfile"
        component={RestaurantProfileTab}
        options={{ title: 'Hồ sơ' }}
      />
    </Tab.Navigator>
  );
}
