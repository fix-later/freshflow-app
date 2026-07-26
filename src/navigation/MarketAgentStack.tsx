import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarketAgentHomeScreen } from '../features/inventory/screens/MarketAgentHomeScreen';
import { MarketKiosksScreen } from '../features/inventory/screens/MarketKiosksScreen';
import { ProcurementTaskDetailScreen } from '../features/procurement/screens/ProcurementTaskDetailScreen';

import { UpdatePriceScreen } from '../features/pricing/screens/UpdatePriceScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type MarketAgentStackParamList, type MarketHomeStackParamList } from './types';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

const Tab = createBottomTabNavigator<MarketAgentStackParamList>();
const HomeStack = createNativeStackNavigator<MarketHomeStackParamList>();

function MarketAgentHomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: Fonts.semibold,
          fontSize: 18,
          color: Colors.deepTeal,
        },
        headerTintColor: Colors.deepTeal,
        headerShadowVisible: false,
      }}
    >
      <HomeStack.Screen
        name="MarketAgentHomeMain"
        component={MarketAgentHomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="MarketKiosks"
        component={MarketKiosksScreen}
        options={({ route }) => ({
          title: route.params?.marketName || 'Danh sách Kiosk',
        })}
      />
      <HomeStack.Screen
        name="ProcurementTaskDetail"
        component={ProcurementTaskDetailScreen}
        options={{ title: 'Chi tiết thu mua' }}
      />
    </HomeStack.Navigator>
  );
}

const TAB_CONFIG = {
  MarketAgentHome: {
    label: 'Tổng quan',
    icon: 'home-outline' as const,
    activeIcon: 'home' as const,
  },
  UpdatePrice: {
    label: 'Cập nhật giá',
    icon: 'pricetags-outline' as const,
    activeIcon: 'pricetags' as const,
  },
  MarketAgentProfile: {
    label: 'Tài khoản',
    icon: 'person-circle-outline' as const,
    activeIcon: 'person-circle' as const,
  },
} as const;

export function MarketAgentStack() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];

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
          tabBarLabel: config.label,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: Colors.primaryText,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            elevation: 2,
            shadowColor: Colors.deepTeal,
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            height: 68 + Math.max(insets.bottom - 8, 0),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.semibold,
            fontSize: 11,
            lineHeight: 14,
            marginTop: 2,
          },
          tabBarIcon: ({ focused, size }) => (
            <View
              style={{
                width: 58,
                height: 32,
                borderRadius: 16,
                backgroundColor: focused ? Colors.primaryLight : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={focused ? config.activeIcon : config.icon}
                size={focused ? size + 1 : size}
                color={
                  focused
                    ? Colors.primaryText
                    : Colors.textSecondary
                }
              />
            </View>
          ),
        };
      }}
    >
      <Tab.Screen name="MarketAgentHome" component={MarketAgentHomeNavigator} options={{ title: 'Tổng quan', headerShown: false }} />
      <Tab.Screen name="UpdatePrice" component={UpdatePriceScreen} options={{ title: 'Cập nhật giá', headerShown: false }} />
      <Tab.Screen name="MarketAgentProfile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
