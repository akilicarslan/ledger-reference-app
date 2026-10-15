import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createApiClient, installGlobalErrorHandlers } from '@ledger/core';
import { AppProviders, AppShell } from '@ledger/features';
import { webPlatformServices } from './platform';

installGlobalErrorHandlers();

const api = createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000' });

const container = document.getElementById('root');
if (!container) throw new Error('The #root element is missing in index.html.');

createRoot(container).render(
  <StrictMode>
    <AppProviders api={api} services={webPlatformServices}>
      <AppShell />
    </AppProviders>
  </StrictMode>,
);
