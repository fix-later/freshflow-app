import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverHomeScreen } from '../features/delivery/screens/DriverHomeScreen';
import { StopListScreen } from '../features/delivery/screens/StopListScreen';
import { NavigationScreen } from '../features/delivery/screens/NavigationScreen';
import { type DriverStackParamList } from './types';

const Stack = createNativeStackNavigator<DriverStackParamList>();

export function DriverStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Trang chủ' }} />
      <Stack.Screen name="StopList" component={StopListScreen} options={{ title: 'Danh sách điểm dừng' }} />
      <Stack.Screen name="DriverNavigation" component={NavigationScreen} options={{ title: 'Điều hướng' }} />
    </Stack.Navigator>
  );
}
