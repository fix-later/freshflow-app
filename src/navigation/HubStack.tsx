import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HubDashboardScreen } from '../features/hub/screens/HubDashboardScreen';
import { CheckInScreen } from '../features/hub/screens/CheckInScreen';
import { SortingScreen } from '../features/hub/screens/SortingScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type HubStackParamList } from './types';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<HubStackParamList>();

const TAB_ICON = {
  HubDashboard: { focused: 'grid', unfocused: 'grid-outline' },
  CheckIn: { focused: 'download', unfocused: 'download-outline' },
  Sorting: { focused: 'layers', unfocused: 'layers-outline' },
  HubProfile: { focused: 'person-circle', unfocused: 'person-circle-outline' },
} as const;

export function HubStack() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
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
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Nhận hàng' }} />
      <Tab.Screen name="Sorting" component={SortingScreen} options={{ title: 'Phân loại' }} />
      <Tab.Screen name="HubProfile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}
