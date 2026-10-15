import { randomUUID } from 'node:crypto';
import { toCents } from '@ledger/contracts';
import { createApp } from './app';
import { loadConfig } from './config';
import { Ledger } from './domain/ledger';
import { StockMarket } from './domain/stocks';
import { realSleep } from './http/chaos';
import { JsonFileLedgerRepository } from './store/ledgerRepository';
import { seedIfEmpty } from './store/seed';
import { TraceStore } from './tracing/traceStore';

const config = loadConfig();
const now = () => new Date();
const log = (message: string) =>
  console.log(message.startsWith('{') ? message : `[ledger-api] ${message}`);
const publicUrl = config.PUBLIC_URL ?? `http://localhost:${config.PORT}`;

const repository = new JsonFileLedgerRepository(config.DATA_FILE);
const seeded = config.SEED_ON_FIRST_START && seedIfEmpty(repository, config.SEED_FILE);
const ledger = new Ledger({
  repository,
  now,
  newId: randomUUID,
  initialBalanceCents: toCents(config.INITIAL_BALANCE),
});

const app = createApp({
  ledger,
  market: new StockMarket(Math.random, now),
  traces: new TraceStore({ filePath: config.TRACE_FILE }),
  now,
  chaos: {
    failureRate: config.CHAOS_FAILURE_RATE,
    minLatencyMs: config.CHAOS_MIN_LATENCY_MS,
    maxLatencyMs: config.CHAOS_MAX_LATENCY_MS,
    random: Math.random,
    sleep: realSleep,
  },
  publicUrl,
  startedAt: now(),
  log,
  logRequests: config.LOG_REQUESTS,
});

const server = app.listen(config.PORT, config.HOST, () => {
  log(`API:        ${publicUrl}/api/v1`);
  log(`Swagger UI: ${publicUrl}/docs`);
  log(
    `Data:       ${repository.description} (${ledger.transactionCount} transactions${seeded ? ', seeded' : ''})`,
  );
  log(`Traces:     ${config.TRACE_FILE ?? 'memory only'}`);
  log(
    `Chaos:      failure rate ${config.CHAOS_FAILURE_RATE}, latency ${config.CHAOS_MIN_LATENCY_MS}-${config.CHAOS_MAX_LATENCY_MS} ms`,
  );
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
