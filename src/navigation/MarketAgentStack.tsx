import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MarketAgentHomeScreen } from '../features/inventory/screens/MarketAgentHomeScreen';
import { InventoryScreen } from '../features/inventory/screens/InventoryScreen';
import { UpdatePriceScreen } from '../features/pricing/screens/UpdatePriceScreen';
import { type MarketAgentStackParamList } from './types';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<MarketAgentStackParamList>();

const TAB_ICON = {
  MarketAgentHome: { focused: 'home', unfocused: 'home-outline' },
  MarketAgentInventory: { focused: 'cube', unfocused: 'cube-outline' },
  UpdatePrice: { focused: 'create', unfocused: 'create-outline' },
} as const;

export function MarketAgentStack() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
      <Tab.Screen name="MarketAgentHome" component={MarketAgentHomeScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="MarketAgentInventory" component={InventoryScreen} options={{ title: 'Tồn kho' }} />
      <Tab.Screen name="UpdatePrice" component={UpdatePriceScreen} options={{ title: 'Cập nhật giá' }} />
    </Tab.Navigator>
  );
}
