import detoxGlobalTeardown from 'detox/runners/jest/globalTeardown';

export default async function globalTeardown(...args: Parameters<typeof detoxGlobalTeardown>) {
  try {
    await detoxGlobalTeardown(...args);
  } finally {
    globalThis.__LEDGER_E2E_SERVER__?.kill();
  }
}
