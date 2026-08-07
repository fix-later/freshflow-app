import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RestaurantProfileTab } from './RestaurantProfileTab';
import { RestaurantOrdersTab } from './RestaurantOrdersTab';
import { RestaurantOrderManagementTab } from './RestaurantOrderManagementTab';
import { RestaurantFavoritesTab } from './RestaurantFavoritesTab';
import { RestaurantAssistantTab } from './RestaurantAssistantTab';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { type RestaurantTabParamList } from './types';

const Tab = createBottomTabNavigator<RestaurantTabParamList>();

const TAB_CONFIG = {
  RestaurantOrders: {
    label: 'Mua sắm',
    icon: 'bag-handle-outline' as const,
    activeIcon: 'bag-handle' as const,
  },
  RestaurantFavorites: {
    label: 'Yêu thích',
    icon: 'heart-outline' as const,
    activeIcon: 'heart' as const,
  },
  RestaurantAssistant: {
    label: 'AI',
    icon: 'sparkles' as const,
    activeIcon: 'sparkles' as const,
  },
  RestaurantTracking: {
    label: 'Đơn hàng',
    icon: 'receipt-outline' as const,
    activeIcon: 'receipt' as const,
  },
  RestaurantProfile: {
    label: 'Tài khoản',
    icon: 'person-circle-outline' as const,
    activeIcon: 'person-circle' as const,
  },
} as const;

export function RestaurantTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
        const isAssistant = route.name === 'RestaurantAssistant';
        return {
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.deepTeal,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            color: Colors.deepTeal,
            fontFamily: Fonts.semibold,
            fontSize: 18,
          },
          headerShadowVisible: false,
          tabBarLabel: config?.label,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            elevation: 2,
            shadowColor: Colors.deepTeal,
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            height: 72 + Math.max(insets.bottom - 8, 0),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 7,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.semibold,
            fontSize: 11,
            lineHeight: 14,
            marginTop: isAssistant ? 12 : 2,
          },
          tabBarActiveTintColor: Colors.primaryText,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarIcon: ({ focused, size }) => {
            if (isAssistant) {
              return (
                <View
                  style={{
                    width: 58,
                    height: 58,
                    marginTop: -25,
                    borderRadius: 29,
                    backgroundColor: Colors.deepTeal,
                    borderWidth: 5,
                    borderColor: Colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: Colors.deepTeal,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="sparkles" size={25} color={Colors.primary} />
                </View>
              );
            }
            return (
              <Ionicons
                name={focused ? config.activeIcon : config.icon}
                size={focused ? size + 1 : size}
                color={focused ? Colors.primaryText : Colors.textSecondary}
              />
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
        component={RestaurantFavoritesTab}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="RestaurantAssistant"
        component={RestaurantAssistantTab}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="RestaurantTracking"
        component={RestaurantOrderManagementTab}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="RestaurantProfile"
        component={RestaurantProfileTab}
        options={{ title: 'Tài khoản' }}
      />
    </Tab.Navigator>
  );
}
