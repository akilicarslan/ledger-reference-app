import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Starts the real mock API for the end-to-end tests.
 * - Chaos is off (no random delay, no random failure), so the tests are stable.
 * - The ledger and the trace log are in a new temporary folder and the seed is
 *   off, so each test run starts with a balance of 0.
 */
export const E2E_API_URL = 'http://localhost:4000';

const repoRoot = path.resolve(__dirname, '../../..');
const serverEntry = path.join(repoRoot, 'apps/server/src/index.ts');
const tsxCli = require.resolve('tsx/cli', { paths: [path.join(repoRoot, 'apps/server')] });

async function isUp(): Promise<boolean> {
  try {
    const response = await fetch(`${E2E_API_URL}/api/v1/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function startMockServer(): Promise<ChildProcess> {
  if (await isUp()) {
    throw new Error(
      'A server already uses port 4000. Stop it (for example "pnpm dev:server"), then run the e2e tests again. The tests need an empty ledger.',
    );
  }
  const dataDir = mkdtempSync(path.join(tmpdir(), 'ledger-e2e-'));
  const child = spawn(process.execPath, [tsxCli, serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: '4000',
      CHAOS_FAILURE_RATE: '0',
      CHAOS_MIN_LATENCY_MS: '0',
      CHAOS_MAX_LATENCY_MS: '0',
      LOG_REQUESTS: 'false',
      DATA_FILE: path.join(dataDir, 'ledger.json'),
      TRACE_FILE: path.join(dataDir, 'traces.jsonl'),
      SEED_ON_FIRST_START: 'false',
    },
    stdio: 'inherit',
  });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await isUp()) return child;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  child.kill();
  throw new Error('The mock server did not start in 10 seconds.');
}
