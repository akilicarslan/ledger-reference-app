import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  CreateTransactionResult,
  ErrorBody,
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAYED_HEADER,
  IdempotencyKey,
  newIdempotencyKey,
  TRACEPARENT_HEADER,
  type Trace,
} from '@ledger/contracts';
import { InMemoryLedgerRepository } from '../src/store/ledgerRepository';
import { createTestApp, newTestLedger, TRACE_A } from './helpers';

const KEY = '6f1c2a3e-8b4d-4f0a-9c1e-2d3b4a5c6d7e';
const TRACE_B = '0af7651916cd43dd8448eb211c80319c';
const salary = { type: 'credit', amount: 100, title: 'Salary' } as const;

describe('newIdempotencyKey', () => {
  it('creates a valid UUID v4 each time', () => {
    const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(IdempotencyKey.safeParse(key).success).toBe(true);
  });
});

describe('Ledger idempotency', () => {
  it('records a retry with the same key and data only one time', () => {
    const ledger = newTestLedger();
    const first = ledger.record(
      { ...salary, description: '' },
      { traceId: TRACE_A, idempotencyKey: KEY },
    );
    const retry = ledger.record(
      { ...salary, description: '' },
      { traceId: TRACE_B, idempotencyKey: KEY },
    );
    expect(first.replayed).toBe(false);
    expect(retry.replayed).toBe(true);
    expect(retry.transaction).toEqual(first.transaction);
    expect(retry.transaction.traceId).toBe(TRACE_A);
    expect(ledger.transactionCount).toBe(1);
    expect(ledger.getBalance().amount).toBe(100);
  });

  it('refuses the same key with different data', () => {
    const ledger = newTestLedger();
    ledger.record({ ...salary, description: '' }, { traceId: TRACE_A, idempotencyKey: KEY });
    expect(() =>
      ledger.record(
        { ...salary, amount: 200, description: '' },
        { traceId: TRACE_B, idempotencyKey: KEY },
      ),
    ).toThrow('Idempotency key reused');
    expect(ledger.transactionCount).toBe(1);
  });

  it('remembers the keys after a restart (the key is in the data file)', () => {
    const repository = new InMemoryLedgerRepository();
    newTestLedger(repository).record(
      { ...salary, description: '' },
      { traceId: TRACE_A, idempotencyKey: KEY },
    );
    const restarted = newTestLedger(repository);
    const retry = restarted.record(
      { ...salary, description: '' },
      { traceId: TRACE_B, idempotencyKey: KEY },
    );
    expect(retry.replayed).toBe(true);
    expect(restarted.transactionCount).toBe(1);
  });

  it('records two transactions when the client sends no key', () => {
    const ledger = newTestLedger();
    ledger.record({ ...salary, description: '' }, { traceId: TRACE_A });
    ledger.record({ ...salary, description: '' }, { traceId: TRACE_B });
    expect(ledger.transactionCount).toBe(2);
  });
});

describe('POST /api/v1/transactions with idempotency-key', () => {
  it('sends the stored result and idempotent-replayed: true for a retry', async () => {
    const { app, ledger } = createTestApp();
    const first = await request(app)
      .post('/api/v1/transactions')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .send(salary)
      .expect(200);
    expect(first.headers[IDEMPOTENT_REPLAYED_HEADER]).toBe('false');

    const retry = await request(app)
      .post('/api/v1/transactions')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .set(TRACEPARENT_HEADER, `00-${TRACE_B}-00f067aa0ba902b7-01`)
      .send(salary)
      .expect(200);
    expect(retry.headers[IDEMPOTENT_REPLAYED_HEADER]).toBe('true');
    const body = CreateTransactionResult.parse(retry.body);
    expect(body.transaction.id).toBe(CreateTransactionResult.parse(first.body).transaction.id);
    expect(body.transaction.idempotencyKey).toBe(KEY);
    expect(body.balance.amount).toBe(100);
    expect(ledger.transactionCount).toBe(1);

    // The trace of the retry shows that the server did not record a second transaction.
    const trace = await request(app).get(`/api/v1/traces/${TRACE_B}`).expect(200);
    expect((trace.body as Trace).events.map((event) => event.name)).toContain(
      'ledger.transaction.replayed',
    );
  });

  it('sends 500 and IDEMPOTENCY_KEY_REUSED for the same key with a different body', async () => {
    const { app } = createTestApp();
    await request(app)
      .post('/api/v1/transactions')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .send(salary)
      .expect(200);
    const response = await request(app)
      .post('/api/v1/transactions')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .send({ ...salary, amount: 5 })
      .expect(500);
    expect(ErrorBody.parse(response.body).error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('sends 500 and VALIDATION_FAILED for a key that is not a UUID v4', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/v1/transactions')
      .set(IDEMPOTENCY_KEY_HEADER, 'abc')
      .send(salary)
      .expect(500);
    expect(ErrorBody.parse(response.body).error.code).toBe('VALIDATION_FAILED');
  });
});
