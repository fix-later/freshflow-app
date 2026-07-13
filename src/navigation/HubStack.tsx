import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HubDashboardScreen } from '../features/hub/screens/HubDashboardScreen';
import { MarketDispatchScreen } from '../features/hub/screens/MarketDispatchScreen';
import { CheckInScreen } from '../features/hub/screens/CheckInScreen';
import { InboundQueueScreen } from '../features/hub/screens/InboundQueueScreen';
import { QualityCheckScreen } from '../features/hub/screens/QualityCheckScreen';
import { SortingScreen } from '../features/hub/screens/SortingScreen';
import { DriverHandoffScreen } from '../features/hub/screens/DriverHandoffScreen';
import { IncidentReportScreen } from '../features/hub/screens/IncidentReportScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type HubStackParamList, type HubTabParamList } from './types';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<HubTabParamList>();
const Stack = createNativeStackNavigator<HubStackParamList>();

const TAB_ICON = {
  HubDashboard: { focused: 'speedometer', unfocused: 'speedometer-outline' },
  InboundQueue: { focused: 'file-tray-full', unfocused: 'file-tray-full-outline' },
  Sorting: { focused: 'layers', unfocused: 'layers-outline' },
  HubProfile: { focused: 'person-circle', unfocused: 'person-circle-outline' },
} as const;

function HubTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 4,
          height: 56 + (insets.bottom > 0 ? insets.bottom - 4 : 0),
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
      <Tab.Screen name="HubDashboard" component={HubDashboardScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="InboundQueue" component={InboundQueueScreen} options={{ title: 'Lô hàng' }} />
      <Tab.Screen name="Sorting" component={SortingScreen} options={{ title: 'Phân loại' }} />
      <Tab.Screen name="HubProfile" component={ProfileScreen} options={{ title: 'Hồ sơ', headerShown: true }} />
    </Tab.Navigator>
  );
}

export function HubStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: Colors.onPrimary,
        headerStyle: { backgroundColor: Colors.primary },
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="HubTabs" component={HubTabs} options={{ headerShown: false }} />
      <Stack.Screen name="MarketDispatch" component={MarketDispatchScreen} options={{ title: 'Phân công xe đi chợ' }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Kiểm đếm lô hàng' }} />
      <Stack.Screen name="QualityCheck" component={QualityCheckScreen} options={{ title: 'Kiểm tra chất lượng' }} />
      <Stack.Screen name="DriverHandoff" component={DriverHandoffScreen} options={{ title: 'Bàn giao tài xế' }} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} options={{ title: 'Báo cáo sự cố' }} />
    </Stack.Navigator>
  );
}
