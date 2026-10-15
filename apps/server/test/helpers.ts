import { createApp } from '../src/app';
import { Ledger } from '../src/domain/ledger';
import { StockMarket } from '../src/domain/stocks';
import type { ChaosOptions } from '../src/http/chaos';
import { InMemoryLedgerRepository, type LedgerRepository } from '../src/store/ledgerRepository';
import { TraceStore } from '../src/tracing/traceStore';

export const FIXED_NOW = new Date('2026-10-13T09:00:00.000Z');
export const TRACE_A = '4bf92f3577b34da6a3ce929d0e0e4736';

/** Returns ids 00000000-0000-4000-8000-000000000001, ...002, and so on. */
export function sequentialIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `00000000-0000-4000-8000-${String(next).padStart(12, '0')}`;
  };
}

export function newTestLedger(repository: LedgerRepository = new InMemoryLedgerRepository()) {
  return new Ledger({ now: () => FIXED_NOW, newId: sequentialIds(), repository });
}

export function createTestApp(chaos: Partial<ChaosOptions> = {}) {
  const now = () => FIXED_NOW;
  const repository = new InMemoryLedgerRepository();
  const ledger = newTestLedger(repository);
  const traces = new TraceStore();
  const app = createApp({
    ledger,
    market: new StockMarket(() => 0.5, now),
    traces,
    now,
    chaos: {
      failureRate: 0,
      minLatencyMs: 0,
      maxLatencyMs: 0,
      random: () => 0.99,
      sleep: async () => {},
      ...chaos,
    },
    publicUrl: 'http://localhost:4000',
    startedAt: now(),
    log: () => {},
    logRequests: false,
  });
  return { app, ledger, traces, repository };
}
