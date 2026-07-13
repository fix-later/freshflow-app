import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverHomeScreen } from '../features/delivery/screens/DriverHomeScreen';
import { PickupConfirmScreen } from '../features/delivery/screens/PickupConfirmScreen';
import { StopListScreen } from '../features/delivery/screens/StopListScreen';
import { NavigationScreen } from '../features/delivery/screens/NavigationScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type DriverStackParamList } from './types';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<DriverStackParamList>();

function ProfileHeaderButton() {
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate('DriverProfile')} hitSlop={8} style={{ paddingHorizontal: 8 }}>
      <Ionicons name="person-circle-outline" size={26} color={Colors.primary} />
    </Pressable>
  );
}

export function DriverStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: 'Trang chủ', headerRight: () => <ProfileHeaderButton /> }}
      />
      <Stack.Screen
        name="PickupConfirm"
        component={PickupConfirmScreen}
        options={{ title: 'Nhận hàng tại Hub', animation: 'slide_from_right' }}
      />
      <Stack.Screen name="StopList" component={StopListScreen} options={{ title: 'Danh sách điểm dừng' }} />
      <Stack.Screen name="DriverNavigation" component={NavigationScreen} options={{ title: 'Điều hướng' }} />
      <Stack.Screen name="DriverProfile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    </Stack.Navigator>
  );
}
