import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DATA_DIR } from '../src/config';
import { Ledger } from '../src/domain/ledger';
import { JsonFileLedgerRepository, LedgerFileError } from '../src/store/ledgerRepository';
import { seedIfEmpty } from '../src/store/seed';
import { TraceStore } from '../src/tracing/traceStore';
import { FIXED_NOW, TRACE_A, newTestLedger, sequentialIds } from './helpers';
import { rmSync } from 'node:fs';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'ledger-store-'));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('JsonFileLedgerRepository', () => {
  it('returns null when the file does not exist', () => {
    expect(new JsonFileLedgerRepository(join(directory, 'missing.json')).load()).toBeNull();
  });

  it('writes pretty JSON, reads it back and leaves no temporary file', () => {
    const file = join(directory, 'nested', 'ledger.json');
    const repository = new JsonFileLedgerRepository(file);
    newTestLedger(repository).record(
      { type: 'credit', amount: 12.34, title: 'Pay', description: 'x' },
      { traceId: TRACE_A },
    );
    expect(readFileSync(file, 'utf8')).toContain('\n  "transactions": [');
    expect(repository.load()?.transactions[0]).toMatchObject({ amount: 12.34, traceId: TRACE_A });
    expect(readdirSync(join(directory, 'nested'))).toEqual(['ledger.json']);
  });

  it('refuses a file that is not valid JSON or does not match the schema', () => {
    const file = join(directory, 'ledger.json');
    writeFileSync(file, '{ not json');
    expect(() => new JsonFileLedgerRepository(file).load()).toThrow(LedgerFileError);
    writeFileSync(file, JSON.stringify({ version: 2, transactions: [] }));
    expect(() => new JsonFileLedgerRepository(file).load()).toThrow(/version/);
  });
});

describe('seed data', () => {
  it('the committed seed.json is valid and consistent (schema and balance replay)', () => {
    const seed = new JsonFileLedgerRepository(join(DEFAULT_DATA_DIR, 'seed.json'));
    const ledger = new Ledger({ repository: seed, now: () => FIXED_NOW, newId: sequentialIds() });
    expect(ledger.transactionCount).toBeGreaterThanOrEqual(10);
    expect(ledger.getBalance().amount).toBeGreaterThan(0);
  });

  it('copies the seed into an empty repository only', () => {
    const target = new JsonFileLedgerRepository(join(directory, 'ledger.json'));
    expect(seedIfEmpty(target, join(DEFAULT_DATA_DIR, 'seed.json'))).toBe(true);
    const count = target.load()?.transactions.length;
    expect(count).toBeGreaterThan(0);
    // A second call does not overwrite the user's data.
    expect(seedIfEmpty(target, join(DEFAULT_DATA_DIR, 'seed.json'))).toBe(false);
  });

  it('does nothing when the seed file does not exist', () => {
    const target = new JsonFileLedgerRepository(join(directory, 'ledger.json'));
    expect(seedIfEmpty(target, join(directory, 'none.json'))).toBe(false);
    expect(existsSync(join(directory, 'ledger.json'))).toBe(false);
  });
});

describe('TraceStore', () => {
  const event = (name: string, traceId = TRACE_A) => ({
    traceId,
    spanId: '00f067aa0ba902b7',
    name,
    at: FIXED_NOW.toISOString(),
    attributes: {},
  });

  it('appends JSON lines and loads them after a restart', () => {
    const file = join(directory, 'traces.jsonl');
    const store = new TraceStore({ filePath: file });
    store.record(event('a'));
    store.record(event('b'));
    store.record(event('other', 'ffffffffffffffffffffffffffffffff'));
    expect(readFileSync(file, 'utf8').trim().split('\n')).toHaveLength(3);
    const restarted = new TraceStore({ filePath: file });
    expect(restarted.get(TRACE_A).map((item) => item.name)).toEqual(['a', 'b']);
  });

  it('ignores a damaged line and keeps only the newest events in memory', () => {
    const file = join(directory, 'traces.jsonl');
    writeFileSync(file, `${JSON.stringify(event('ok'))}\n{ broken\n`);
    expect(new TraceStore({ filePath: file }).get(TRACE_A)).toHaveLength(1);

    const small = new TraceStore({ maxEvents: 2 });
    small.record(event('1'));
    small.record(event('2'));
    small.record(event('3'));
    expect(small.get(TRACE_A).map((item) => item.name)).toEqual(['2', '3']);
  });
});
