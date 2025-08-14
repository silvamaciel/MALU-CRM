// App.tsx
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotifications, scheduleDailySummary } from './src/utils/notifications';

const qc = new QueryClient();

export default function App() {
  useEffect(() => {
    (async () => {
      await setupNotifications();
      await scheduleDailySummary(8); // 08:00 locais
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
