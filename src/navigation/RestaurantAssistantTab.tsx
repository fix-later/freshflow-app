import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { RestaurantAssistantScreen } from '../features/assistant/screens/RestaurantAssistantScreen';
import { DeliveryAddressesScreen } from '../features/restaurant/screens/DeliveryAddressesScreen';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { type RestaurantAssistantStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantAssistantStackParamList>();

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

export function RestaurantAssistantTab() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="AssistantChat"
        component={RestaurantAssistantScreen}
        options={{ headerShown: false }}
      />
      {/* Also reachable from Profile > DeliveryAddresses — registered here too so
          "Thêm địa chỉ" from the order-confirmation card in chat pushes onto this
          same stack instead of switching tabs, letting the back button return to the chat. */}
      <Stack.Screen
        name="DeliveryAddresses"
        component={DeliveryAddressesScreen}
        options={{ title: 'Địa chỉ giao hàng' }}
      />
    </Stack.Navigator>
  );
}
