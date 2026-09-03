import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationDto } from '../api/notificationApi';

const DEFAULT_CHANNEL_ID = 'default';

// This handler is only for notifications scheduled locally after a SignalR
// event. No Expo push token or remote push service is used.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function hasNotificationPermission(status: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS !== 'ios') return status.granted;

  const iosStatus = status.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;

  if (Platform.OS === 'android') {
    // Android 13 does not show its notification permission prompt until a
    // channel exists, so always create the channel before requesting access.
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: 'Thông báo FreshFlow',
      description: 'Nhận thông báo mới khi FreshFlow đang chạy.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2BBFA4',
      sound: 'default',
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!hasNotificationPermission(permission) && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  return hasNotificationPermission(permission);
}

export async function presentLocalNotification(item: NotificationDto): Promise<boolean> {
  try {
    if (!(await ensureLocalNotificationPermission())) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: 'default',
        data: {
          notificationId: item.id,
          type: item.type,
          ...(item.payload ? { payload: item.payload } : {}),
        },
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.warn('Unable to present local notification:', error);
    return false;
  }
}
