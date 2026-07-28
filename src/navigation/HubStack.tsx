import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HubDashboardScreen } from '../features/hub/screens/HubDashboardScreen';
import { MarketDispatchScreen } from '../features/hub/screens/MarketDispatchScreen';
import { HubProcurementWeekScreen } from '../features/hub/screens/HubProcurementWeekScreen';
import { HubBatchOrdersScreen } from '../features/hub/screens/HubBatchOrdersScreen';
import { CheckInScreen } from '../features/hub/screens/CheckInScreen';
import { InboundQueueScreen } from '../features/hub/screens/InboundQueueScreen';
import { QualityCheckScreen } from '../features/hub/screens/QualityCheckScreen';
import { SortingScreen } from '../features/hub/screens/SortingScreen';
import { DriverHandoffScreen } from '../features/hub/screens/DriverHandoffScreen';
import { IncidentReportScreen } from '../features/hub/screens/IncidentReportScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type HubStackParamList, type HubTabParamList } from './types';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

const Tab = createBottomTabNavigator<HubTabParamList>();
const Stack = createNativeStackNavigator<HubStackParamList>();

const TAB_CONFIG = {
  HubDashboard: {
    label: 'Tổng quan',
    icon: 'speedometer-outline' as const,
    activeIcon: 'speedometer' as const,
  },
  InboundQueue: {
    label: 'Lô hàng',
    icon: 'file-tray-full-outline' as const,
    activeIcon: 'file-tray-full' as const,
  },
  Sorting: {
    label: 'Phân loại',
    icon: 'layers-outline' as const,
    activeIcon: 'layers' as const,
  },
  HubProfile: {
    label: 'Tài khoản',
    icon: 'person-circle-outline' as const,
    activeIcon: 'person-circle' as const,
  },
} as const;

function HubTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];

        return {
          headerShown: false,
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
          tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
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
      <Tab.Screen name="HubDashboard" component={HubDashboardScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="InboundQueue" component={InboundQueueScreen} options={{ title: 'Lô hàng' }} />
      <Tab.Screen name="Sorting" component={SortingScreen} options={{ title: 'Phân loại' }} />
      <Tab.Screen name="HubProfile" component={ProfileScreen} options={{ title: 'Tài khoản', headerShown: true }} />
    </Tab.Navigator>
  );
}

export function HubStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.deepTeal,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          color: Colors.deepTeal,
          fontFamily: Fonts.semibold,
          fontSize: 18,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="HubTabs" component={HubTabs} options={{ headerShown: false }} />
      <Stack.Screen name="HubProcurementWeek" component={HubProcurementWeekScreen} options={{ title: 'Kế hoạch hàng về Hub' }} />
      <Stack.Screen name="HubBatchOrders" component={HubBatchOrdersScreen} options={{ title: 'Đơn hàng trong lô' }} />
      <Stack.Screen name="MarketDispatch" component={MarketDispatchScreen} options={{ title: 'Phân xe giao nhà hàng' }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Kiểm đếm lô hàng' }} />
      <Stack.Screen name="QualityCheck" component={QualityCheckScreen} options={{ title: 'Kiểm tra chất lượng' }} />
      <Stack.Screen name="DriverHandoff" component={DriverHandoffScreen} options={{ title: 'Bàn giao tài xế' }} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} options={{ title: 'Báo cáo sự cố' }} />
    </Stack.Navigator>
  );
}
