import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/providers/AppProviders';

export default function App() {
  return (
    <AppProviders>
      <AppNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
