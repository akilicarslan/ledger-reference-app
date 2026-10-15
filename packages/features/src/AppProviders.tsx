import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import {
  ApiProvider,
  createLedgerStore,
  createQueryClient,
  type ApiClient,
  type AppStore,
} from '@ledger/core';
import { ThemeProvider, type ColorScheme } from '@ledger/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { PlatformServicesProvider, type PlatformServices } from './platform';

export interface AppProvidersProps {
  api: ApiClient;
  services: PlatformServices;
  /** Give a store or a query client in tests. The default creates new ones. */
  store?: AppStore;
  queryClient?: QueryClient;
  scheme?: ColorScheme;
  children: ReactNode;
}

/** All app-wide providers in one place. Both apps use this component. */
export function AppProviders({
  api,
  services,
  store,
  queryClient,
  scheme,
  children,
}: AppProvidersProps) {
  const [appStore] = useState(() => store ?? createLedgerStore(api));
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <ReduxProvider store={appStore}>
      <QueryClientProvider client={client}>
        <ApiProvider api={api}>
          <PlatformServicesProvider services={services}>
            <ThemeProvider scheme={scheme}>
              {/* Last line of defence. AppShell also has one boundary for each tab. */}
              <ErrorBoundary section="app">{children}</ErrorBoundary>
            </ThemeProvider>
          </PlatformServicesProvider>
        </ApiProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
