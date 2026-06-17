import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MarketAgentHomeScreen } from '../features/inventory/screens/MarketAgentHomeScreen';
import { MarketKiosksScreen } from '../features/inventory/screens/MarketKiosksScreen';

import { UpdatePriceScreen } from '../features/pricing/screens/UpdatePriceScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type MarketAgentStackParamList, type MarketHomeStackParamList } from './types';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<MarketAgentStackParamList>();
const HomeStack = createNativeStackNavigator<MarketHomeStackParamList>();

function MarketAgentHomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
          color: Colors.textPrimary,
        },
        headerTintColor: Colors.primary,
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
    </HomeStack.Navigator>
  );
}

const TAB_ICON = {
  MarketAgentHome: { focused: 'home', unfocused: 'home-outline' },
  UpdatePrice: { focused: 'create', unfocused: 'create-outline' },
  MarketAgentProfile: { focused: 'person-circle', unfocused: 'person-circle-outline' },
} as const;

export function MarketAgentStack() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
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
      <Tab.Screen name="MarketAgentHome" component={MarketAgentHomeNavigator} options={{ title: 'Tổng quan', headerShown: false }} />
      <Tab.Screen name="UpdatePrice" component={UpdatePriceScreen} options={{ title: 'Cập nhật giá', headerShown: false }} />
      <Tab.Screen name="MarketAgentProfile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}
