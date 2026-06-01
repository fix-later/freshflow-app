import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants';

import AuthNavigator from './AuthNavigator';
import RestaurantNavigator from './RestaurantNavigator';
import MarketAgentNavigator from './MarketAgentNavigator';
import DriverNavigator from './DriverNavigator';
import HubStaffNavigator from './HubStaffNavigator';

import { authEventEmitter } from '../services/apiClient';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isAuthenticated, isLoading, initialize, forceLogout } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, []);

  // Listen for forced logout (token expiry)
  React.useEffect(() => {
    const unsub = authEventEmitter.on('logout', forceLogout);
    return unsub;
  }, [forceLogout]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  const role = user?.role;

  return (
    <NavigationContainer>
      {(role === ROLES.RESTAURANT) && <RestaurantNavigator />}
      {(role === ROLES.MARKET_AGENT || role === ROLES.KIOSK_STAFF) && <MarketAgentNavigator />}
      {role === ROLES.DRIVER && <DriverNavigator />}
      {role === ROLES.HUB_STAFF && <HubStaffNavigator />}
    </NavigationContainer>
  );
}
