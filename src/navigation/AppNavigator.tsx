import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../constants/roles';
import { AuthStack } from './AuthStack';
import { RestaurantTabs } from './RestaurantTabs';
import { MarketAgentStack } from './MarketAgentStack';
import { HubStack } from './HubStack';
import { DriverStack } from './DriverStack';
import { SplashScreen } from '../screens/SplashScreen';
import { RestaurantNotificationsScreen } from '../features/notifications/screens/RestaurantNotificationsScreen';
import {
  flushPendingNotificationNavigation,
  navigationRef,
} from '../features/notifications/navigation/notificationNavigation';
import { type RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Show splash screen while auth is initializing
  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated || !user) return <AuthStack />;

  const RoleHome = (() => {
    switch (user.role) {
      case UserRole.RESTAURANT: return RestaurantTabs;
      case UserRole.MARKET_AGENT: return MarketAgentStack;
      case UserRole.HUB_STAFF: return HubStack;
      case UserRole.DRIVER: return DriverStack;
      default: return null;
    }
  })();

  if (!RoleHome) return <AuthStack />;

  return (
    <RootStack.Navigator key={`${user.id}:${user.role}`}>
      <RootStack.Screen
        name="RoleHome"
        component={RoleHome}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Notifications"
        component={RestaurantNotificationsScreen}
        options={{ title: 'Thông báo' }}
      />
    </RootStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNotificationNavigation}
      onStateChange={flushPendingNotificationNavigation}
    >
      <AppContent />
    </NavigationContainer>
  );
}
