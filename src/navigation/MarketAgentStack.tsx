import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MarketAgentHomeScreen } from '../features/inventory/screens/MarketAgentHomeScreen';
import { InventoryScreen } from '../features/inventory/screens/InventoryScreen';
import { UpdatePriceScreen } from '../features/pricing/screens/UpdatePriceScreen';
import { type MarketAgentStackParamList } from './types';

const Tab = createBottomTabNavigator<MarketAgentStackParamList>();

export function MarketAgentStack() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="MarketAgentHome" component={MarketAgentHomeScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="MarketAgentInventory" component={InventoryScreen} options={{ title: 'Tồn kho' }} />
      <Tab.Screen name="UpdatePrice" component={UpdatePriceScreen} options={{ title: 'Cập nhật giá' }} />
    </Tab.Navigator>
  );
}
