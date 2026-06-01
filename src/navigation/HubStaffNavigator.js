import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HubDashboardScreen from '../screens/hub-staff/HubDashboardScreen';
import ScanInboundScreen from '../screens/hub-staff/ScanInboundScreen';
import DiscrepancyScreen from '../screens/hub-staff/DiscrepancyScreen';
import ProfileScreen from '../screens/restaurant/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HubStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HubDashboard" component={HubDashboardScreen} options={{ title: 'Hub Dashboard' }} />
      <Stack.Screen name="ScanInbound" component={ScanInboundScreen} options={{ title: 'Quét hàng vào' }} />
      <Stack.Screen name="Discrepancy" component={DiscrepancyScreen} options={{ title: 'Báo cáo sai lệch' }} />
    </Stack.Navigator>
  );
}

export default function HubStaffNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Hub: 'cube-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Hub" component={HubStack} options={{ title: 'Hub' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
