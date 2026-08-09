import { type PropsWithChildren, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../store/AuthProvider';
import { CartProvider } from '../store/CartProvider';
import { FavoritesProvider } from '../store/FavoritesProvider';
import { NotificationProvider } from '../features/notifications/context/NotificationProvider';

type AppProvidersProps = PropsWithChildren;

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

