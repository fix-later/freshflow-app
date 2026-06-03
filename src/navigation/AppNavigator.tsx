import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../constants/roles';
import { AuthStack } from './AuthStack';
import { RestaurantTabs } from './RestaurantTabs';
import { MarketAgentStack } from './MarketAgentStack';
import { HubStack } from './HubStack';
import { DriverStack } from './DriverStack';

function RoleNavigator() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) return <AuthStack />;

  switch (user.role) {
    case UserRole.RESTAURANT:    return <RestaurantTabs />;
    case UserRole.MARKET_AGENT:  return <MarketAgentStack />;
    case UserRole.HUB_STAFF:     return <HubStack />;
    case UserRole.DRIVER:        return <DriverStack />;
    default:                     return <AuthStack />;
  }
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <RoleNavigator />
    </NavigationContainer>
  );
}
