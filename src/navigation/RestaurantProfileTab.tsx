import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { RestaurantProfileScreen } from '../features/restaurant/screens/RestaurantProfileScreen';

const Stack = createNativeStackNavigator();

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
    </Stack.Navigator>
  );
}
