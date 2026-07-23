import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/providers/AppProviders';

// Keep the native splash visible while the storefront fonts are loading.
// Expo recommends calling this in global scope so it cannot run too late.
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    // Preserve the legacy aliases used by existing screens while rendering
    // Montserrat consistently throughout the Restaurant experience.
    'Inter-Regular': Montserrat_400Regular,
    'Inter-Medium': Montserrat_500Medium,
    'Inter-SemiBold': Montserrat_600SemiBold,
    'Inter-Bold': Montserrat_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // A font error must not block startup; render with the platform fallback.
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <AppNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
