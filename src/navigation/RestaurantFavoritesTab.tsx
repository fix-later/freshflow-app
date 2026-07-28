import React from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { FavoritesScreen } from '../features/orders/screens/FavoritesScreen';
import { ProductDetailScreen } from '../features/orders/screens/ProductDetailScreen';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { type RestaurantFavoritesStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantFavoritesStackParamList>();

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

export function RestaurantFavoritesTab() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Yêu thích' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Chi tiết sản phẩm' }}
      />
    </Stack.Navigator>
  );
}
