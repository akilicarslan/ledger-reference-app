import detoxGlobalSetup from 'detox/runners/jest/globalSetup';
import { startMockServer } from './mockServer';

declare global {
  // The teardown stops the server that the setup started.
  var __LEDGER_E2E_SERVER__: { kill: () => boolean } | undefined;
}

export default async function globalSetup(...args: Parameters<typeof detoxGlobalSetup>) {
  globalThis.__LEDGER_E2E_SERVER__ = await startMockServer();
  await detoxGlobalSetup(...args);
}
