import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseGate } from './src/components/DatabaseGate';
import { AuthGate } from './src/components/AuthGate';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <DatabaseGate>
        <AuthGate />
      </DatabaseGate>
    </SafeAreaProvider>
  );
}
