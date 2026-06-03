import { type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../store/AuthProvider';

type AppProvidersProps = PropsWithChildren;

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
