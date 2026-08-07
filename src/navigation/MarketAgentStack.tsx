import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarketAgentHomeScreen } from '../features/inventory/screens/MarketAgentHomeScreen';
import { MarketKiosksScreen } from '../features/inventory/screens/MarketKiosksScreen';
import { MarketAgentTasksScreen } from '../features/procurement/screens/MarketAgentTasksScreen';
import { ProcurementTaskDetailScreen } from '../features/procurement/screens/ProcurementTaskDetailScreen';
import {
  MarketAgentTaskRealtimeProvider,
  useMarketAgentTaskRealtime,
} from '../features/procurement/context/MarketAgentTaskRealtimeContext';

import { UpdatePriceScreen } from '../features/pricing/screens/UpdatePriceScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import {
  type MarketAgentStackParamList,
  type MarketHomeStackParamList,
  type MarketTasksStackParamList,
} from './types';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

const Tab = createBottomTabNavigator<MarketAgentStackParamList>();
const HomeStack = createNativeStackNavigator<MarketHomeStackParamList>();
const TasksStack = createNativeStackNavigator<MarketTasksStackParamList>();

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
    </HomeStack.Navigator>
  );
}

function MarketAgentTasksNavigator() {
  return (
    <TasksStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
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
      <TasksStack.Screen
        name="MarketAgentTasksMain"
        component={MarketAgentTasksScreen}
        options={{ headerShown: false }}
      />
      <TasksStack.Screen
        name="ProcurementTaskDetail"
        component={ProcurementTaskDetailScreen}
        options={{ title: 'Chi tiết thu mua' }}
      />
    </TasksStack.Navigator>
  );
}

const TAB_CONFIG = {
  MarketAgentHome: {
    label: 'Tổng quan',
    icon: 'home-outline' as const,
    activeIcon: 'home' as const,
  },
  MarketAgentTasks: {
    label: 'Nhiệm vụ',
    icon: 'clipboard-outline' as const,
    activeIcon: 'clipboard' as const,
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

function MarketAgentTabs() {
  const insets = useSafeAreaInsets();
  const { actionableTaskCount } = useMarketAgentTaskRealtime();

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
            <Ionicons
              name={focused ? config.activeIcon : config.icon}
              size={focused ? size + 1 : size}
              color={focused ? Colors.primaryText : Colors.textSecondary}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="MarketAgentHome" component={MarketAgentHomeNavigator} options={{ title: 'Tổng quan', headerShown: false }} />
      <Tab.Screen
        name="MarketAgentTasks"
        component={MarketAgentTasksNavigator}
        options={{
          title: 'Nhiệm vụ',
          headerShown: false,
          tabBarBadge: actionableTaskCount > 0 ? actionableTaskCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.danger,
            color: Colors.white,
            fontFamily: Fonts.monoBold,
            fontSize: 9,
          },
        }}
      />
      <Tab.Screen name="UpdatePrice" component={UpdatePriceScreen} options={{ title: 'Cập nhật giá', headerShown: false }} />
      <Tab.Screen name="MarketAgentProfile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}

export function MarketAgentStack() {
  return (
    <MarketAgentTaskRealtimeProvider>
      <MarketAgentTabs />
    </MarketAgentTaskRealtimeProvider>
  );
}
