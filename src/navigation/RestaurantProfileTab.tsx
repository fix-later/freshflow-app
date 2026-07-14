import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { RestaurantProfileScreen } from '../features/restaurant/screens/RestaurantProfileScreen';
import { DeliveryAddressesScreen } from '../features/restaurant/screens/DeliveryAddressesScreen';
import { CreditOverviewScreen } from '../features/credit/screens/CreditOverviewScreen';
import { CreditTransactionsScreen } from '../features/credit/screens/CreditTransactionsScreen';
import { CreditStatementsScreen } from '../features/credit/screens/CreditStatementsScreen';
import { type RestaurantProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantProfileStackParamList>();

export function RestaurantProfileTab() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantProfileEdit"
        component={RestaurantProfileScreen}
        options={{ title: 'Thông tin nhà hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DeliveryAddresses"
        component={DeliveryAddressesScreen}
        options={{ title: 'Địa chỉ giao hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreditOverview"
        component={CreditOverviewScreen}
        options={{ title: 'Tín dụng & Thanh toán', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreditTransactions"
        component={CreditTransactionsScreen}
        options={{ title: 'Lịch sử giao dịch', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreditStatements"
        component={CreditStatementsScreen}
        options={{ title: 'Sao kê tín dụng', animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
