import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { RestaurantProfileScreen } from '../features/restaurant/screens/RestaurantProfileScreen';
import { RestaurantPolicyScreen } from '../features/restaurant/screens/RestaurantPolicyScreen';
import { DeliveryAddressesScreen } from '../features/restaurant/screens/DeliveryAddressesScreen';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { CreditOverviewScreen } from '../features/credit/screens/CreditOverviewScreen';
import { CreditStatementsScreen } from '../features/credit/screens/CreditStatementsScreen';
import { InvoiceListScreen } from '../features/invoices/screens/InvoiceListScreen';
import { InvoiceDetailScreen } from '../features/invoices/screens/InvoiceDetailScreen';
import { type RestaurantProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantProfileStackParamList>();

const STACK_SCREEN_OPTIONS = {
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.deepTeal,
  headerTitleAlign: 'center',
  headerTitleStyle: {
    color: Colors.deepTeal,
    fontFamily: Fonts.semibold,
    fontSize: 18,
  },
} satisfies NativeStackNavigationOptions;

export function RestaurantProfileTab() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantProfileEdit"
        component={RestaurantProfileScreen}
        options={{ title: 'Thông tin nhà hàng' }}
      />
      <Stack.Screen
        name="RestaurantPolicy"
        component={RestaurantPolicyScreen}
        options={{ title: 'Chính sách nhà hàng' }}
      />
      <Stack.Screen
        name="DeliveryAddresses"
        component={DeliveryAddressesScreen}
        options={{ title: 'Địa chỉ giao hàng', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreditOverview"
        component={CreditOverviewScreen}
        options={{ title: 'Tín dụng & Thanh toán' }}
      />
      <Stack.Screen
        name="CreditStatements"
        component={CreditStatementsScreen}
        options={{ title: 'Sao kê tín dụng' }}
      />
      <Stack.Screen
        name="Invoices"
        component={InvoiceListScreen}
        options={{ title: 'Hóa đơn VAT' }}
      />
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ title: 'Chi tiết hóa đơn' }}
      />
    </Stack.Navigator>
  );
}
