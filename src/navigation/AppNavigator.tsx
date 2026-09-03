import { useEffect } from 'react';
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

// Every UserRole that has a real mobile stack. Any role string that isn't a
// key here (there shouldn't be one today — authApi.userFromToken already
// rejects roles with no mobile stack via UNSUPPORTED_MOBILE_ROLES before
// sign-in ever completes) falls through to the effect below instead of
// silently rendering the login screen with no explanation.
const ROLE_HOME_MAP: Partial<Record<UserRole, React.ComponentType>> = {
  [UserRole.RESTAURANT]: RestaurantTabs,
  [UserRole.MARKET_AGENT]: MarketAgentStack,
  [UserRole.HUB_STAFF]: HubStack,
  [UserRole.DRIVER]: DriverStack,
};

function AppContent() {
  const { user, isAuthenticated, isLoading, forceSignOutWithNotice } = useAuthStore();
  const RoleHome = user ? ROLE_HOME_MAP[user.role] ?? null : null;

  // Defense in depth: a signed-in user whose role has no entry in
  // ROLE_HOME_MAP would previously just render <AuthStack/> below, which
  // looks identical to a plain "please log in" screen — the user has no way
  // to tell their account was rejected rather than their password being
  // wrong. Sign them out with a real explanation instead.
  useEffect(() => {
    if (isAuthenticated && user && !RoleHome) {
      forceSignOutWithNotice('Tài khoản này chưa được hỗ trợ trên ứng dụng di động.');
    }
  }, [isAuthenticated, user, RoleHome, forceSignOutWithNotice]);

  // Show splash screen while auth is initializing
  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated || !user || !RoleHome) return <AuthStack />;

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
