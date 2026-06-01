import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import DriverRouteScreen from '../screens/driver/DriverRouteScreen';
import DeliveryStopScreen from '../screens/driver/DeliveryStopScreen';
import ProfileScreen from '../screens/restaurant/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RouteStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DriverRoute" component={DriverRouteScreen} options={{ title: 'Lộ trình hôm nay' }} />
      <Stack.Screen name="DeliveryStop" component={DeliveryStopScreen} options={{ title: 'Điểm giao hàng' }} />
    </Stack.Navigator>
  );
}

export default function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Route: 'navigate-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Route" component={RouteStack} options={{ title: 'Lộ trình' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
