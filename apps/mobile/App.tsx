import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createApiClient, installGlobalErrorHandlers } from '@ledger/core';
import { AppProviders, AppShell } from '@ledger/features';
import { useTheme } from '@ledger/ui';
import { resolveApiBaseUrl } from './src/config';
import { mobilePlatformServices } from './src/platform';
import { connectReactQueryToAppState } from './src/reactQueryNative';

installGlobalErrorHandlers();
connectReactQueryToAppState();

const api = createApiClient({ baseUrl: resolveApiBaseUrl() });

function Root() {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppShell />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders api={api} services={mobilePlatformServices}>
        <Root />
      </AppProviders>
    </SafeAreaProvider>
  );
}
