import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HubDashboardScreen } from '../features/hub/screens/HubDashboardScreen';
import { CheckInScreen } from '../features/hub/screens/CheckInScreen';
import { SortingScreen } from '../features/hub/screens/SortingScreen';
import { type HubStackParamList } from './types';

const Tab = createBottomTabNavigator<HubStackParamList>();

export function HubStack() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HubDashboard" component={HubDashboardScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Nhận hàng' }} />
      <Tab.Screen name="Sorting" component={SortingScreen} options={{ title: 'Phân loại' }} />
    </Tab.Navigator>
  );
}
