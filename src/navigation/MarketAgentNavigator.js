import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import MarketProductsScreen from '../screens/market-agent/MarketProductsScreen';
import UpdatePriceScreen from '../screens/market-agent/UpdatePriceScreen';
import PriceHistoryScreen from '../screens/market-agent/PriceHistoryScreen';
import ProfileScreen from '../screens/restaurant/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProductStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MarketProducts" component={MarketProductsScreen} options={{ title: 'Sản phẩm tại chợ' }} />
      <Stack.Screen name="UpdatePrice" component={UpdatePriceScreen} options={{ title: 'Cập nhật giá' }} />
      <Stack.Screen name="PriceHistory" component={PriceHistoryScreen} options={{ title: 'Lịch sử giá' }} />
    </Stack.Navigator>
  );
}

export default function MarketAgentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Products: 'pricetag-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Products" component={ProductStack} options={{ title: 'Sản phẩm' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
