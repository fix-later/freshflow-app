import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import MarketListScreen from '../screens/restaurant/MarketListScreen';
import ProductListScreen from '../screens/restaurant/ProductListScreen';
import OrderListScreen from '../screens/restaurant/OrderListScreen';
import OrderDetailScreen from '../screens/restaurant/OrderDetailScreen';
import CreateOrderScreen from '../screens/restaurant/CreateOrderScreen';
import ProfileScreen from '../screens/restaurant/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MarketStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MarketList" component={MarketListScreen} options={{ title: 'Chợ đầu mối' }} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Sản phẩm' }} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} options={{ title: 'Đặt hàng' }} />
    </Stack.Navigator>
  );
}

function OrderStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'Đơn hàng' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn' }} />
    </Stack.Navigator>
  );
}

export default function RestaurantNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Markets: 'storefront-outline',
            Orders: 'receipt-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Markets" component={MarketStack} options={{ title: 'Chợ' }} />
      <Tab.Screen name="Orders" component={OrderStack} options={{ title: 'Đơn hàng' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
