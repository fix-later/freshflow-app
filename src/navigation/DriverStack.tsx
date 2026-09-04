import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverHomeScreen } from '../features/delivery/screens/DriverHomeScreen';
import { PickupConfirmScreen } from '../features/delivery/screens/PickupConfirmScreen';
import { StopListScreen } from '../features/delivery/screens/StopListScreen';
import { NavigationScreen } from '../features/delivery/screens/NavigationScreen';
import { ProofOfDeliveryScreen } from '../features/delivery/screens/ProofOfDeliveryScreen';
import { ReportDeliveryIssueScreen } from '../features/delivery/screens/ReportDeliveryIssueScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { type DriverStackParamList } from './types';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<DriverStackParamList>();

function ProfileHeaderButton() {
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate('DriverProfile')} hitSlop={8} style={{ paddingHorizontal: 8 }}>
      <Ionicons name="person-circle-outline" size={26} color={Colors.driverPrimary} />
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
      <Stack.Screen name="DriverNavigation" component={NavigationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProofOfDelivery" component={ProofOfDeliveryScreen} options={{ title: 'Bằng chứng giao hàng' }} />
      <Stack.Screen name="ReportDeliveryIssue" component={ReportDeliveryIssueScreen} options={{ title: 'Báo cáo lỗi giao hàng' }} />
      <Stack.Screen
        name="DriverProfile"
        component={ProfileScreen}
        options={{ title: 'Hồ sơ' }}
      />
    </Stack.Navigator>
  );
}
