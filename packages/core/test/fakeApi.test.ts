import { describe, expect, it } from 'vitest';
import { IDEMPOTENCY_KEY_REUSED_MESSAGE, insufficientFundsMessage } from '@ledger/contracts';
import { createFakeApi } from '../src/testing';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const KEY = '6f1c2a3e-8b4d-4f0a-9c1e-2d3b4a5c6d7e';

async function eventNames(api: ReturnType<typeof createFakeApi>, traceId = TRACE_ID) {
  return (await api.getTrace(traceId)).events.map((event) => event.name);
}

describe('createFakeApi (the shared fake of the server)', () => {
  it('calculates in cents and records the transaction with the server events', async () => {
    const api = createFakeApi({ initialBalance: 0.1 });
    const result = await api.createTransaction(
      { type: 'credit', amount: 0.2, title: 'Coins' },
      { traceId: TRACE_ID },
    );
    expect(result.balance.amount).toBe(0.3);
    expect(result.transaction.traceId).toBe(TRACE_ID);
    expect(await api.getRecentTransactions()).toEqual([result.transaction]);
    expect(await eventNames(api)).toEqual([
      'http.request.received',
      'validation.passed',
      'ledger.transaction.recorded',
      'http.response.sent',
    ]);
  });

  it('refuses a negative balance with the server message and the refusal events', async () => {
    const api = createFakeApi({ initialBalance: 20 });
    await expect(
      api.createTransaction({ type: 'debit', amount: 900, title: 'Laptop' }, { traceId: TRACE_ID }),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      message: insufficientFundsMessage(2000),
      traceId: TRACE_ID,
    });
    expect((await api.getBalance()).amount).toBe(20);
    expect(await eventNames(api)).toEqual([
      'http.request.received',
      'validation.passed',
      'ledger.transaction.refused',
      'http.error',
      'http.response.sent',
    ]);
  });

  it('replays a retry with the same idempotency key and records nothing', async () => {
    const api = createFakeApi();
    const input = { type: 'credit', amount: 100, title: 'Salary' } as const;
    const first = await api.createTransaction(input, { idempotencyKey: KEY });
    const retry = await api.createTransaction(input, { idempotencyKey: KEY, traceId: TRACE_ID });
    expect(retry.transaction).toEqual(first.transaction);
    expect(retry.balance.amount).toBe(100);
    expect(await api.getRecentTransactions()).toHaveLength(1);
    expect(await eventNames(api)).toContain('ledger.transaction.replayed');

    await expect(
      api.createTransaction({ ...input, amount: 5 }, { idempotencyKey: KEY }),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
      message: IDEMPOTENCY_KEY_REUSED_MESSAGE,
    });
  });

  it('refuses data that the server schema refuses', async () => {
    const api = createFakeApi();
    await expect(
      api.createTransaction({ type: 'credit', amount: -1, title: 'Bad' }, { traceId: TRACE_ID }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(await eventNames(api)).toContain('validation.failed');
  });
});
