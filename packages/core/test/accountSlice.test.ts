import { describe, expect, it } from 'vitest';
import { fetchAccount, submitStatusCleared, submitTransaction } from '../src/store/accountSlice';
import { symbolAdded, symbolRemoved, MAX_WATCHLIST_LENGTH } from '../src/store/marketsSlice';
import { createLedgerStore } from '../src/store/store';
import { ApiError } from '../src/api/errors';
import { createFakeApi } from './fakes';
import { draftFieldChanged } from '../src/store/transactionDraftSlice';
import { EMPTY_DRAFT } from '../src/forms/transactionForm';

describe('account slice', () => {
  it('loads the balance and the recent transactions', async () => {
    const api = createFakeApi(40);
    const store = createLedgerStore(api);
    await store.dispatch(fetchAccount());
    const { account } = store.getState();
    expect(account.balance?.amount).toBe(40);
    expect(account.load).toEqual({ status: 'succeeded', error: null });
  });

  it('keeps the load error for the UI', async () => {
    const api = createFakeApi();
    api.getBalance.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'No connection.'));
    const store = createLedgerStore(api);
    await store.dispatch(fetchAccount());
    expect(store.getState().account.load).toMatchObject({
      status: 'failed',
      error: { code: 'NETWORK_ERROR', message: 'No connection.', traceId: expect.any(String) },
    });
  });

  it('updates the balance and puts the new transaction first, with a maximum of 5', async () => {
    const api = createFakeApi();
    const store = createLedgerStore(api);
    for (let index = 1; index <= 6; index += 1) {
      await store.dispatch(
        submitTransaction({ input: { type: 'credit', amount: index, title: `Deposit ${index}` } }),
      );
    }
    const { account } = store.getState();
    expect(account.balance?.amount).toBe(21);
    expect(account.recent.map((item) => item.title)).toEqual([
      'Deposit 6',
      'Deposit 5',
      'Deposit 4',
      'Deposit 3',
      'Deposit 2',
    ]);
    expect(account.submit.status).toBe('succeeded');
    expect(account.submit.lastTransaction?.title).toBe('Deposit 6');
  });

  it('surfaces INSUFFICIENT_FUNDS to the UI and keeps the old balance', async () => {
    const api = createFakeApi(10);
    const store = createLedgerStore(api);
    await store.dispatch(fetchAccount());
    await store.dispatch(
      submitTransaction({ input: { type: 'debit', amount: 25, title: 'Laptop' } }),
    );
    const { account } = store.getState();
    expect(account.submit.status).toBe('failed');
    expect(account.submit.error?.code).toBe('INSUFFICIENT_FUNDS');
    expect(account.balance?.amount).toBe(10);
    // The error and the submit state have the trace of the user action (the Reference ID).
    expect(account.submit.error?.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(account.submit.trace?.traceId).toBe(account.submit.error?.traceId);

    store.dispatch(submitStatusCleared());
    expect(store.getState().account.submit).toEqual({
      status: 'idle',
      error: null,
      lastTransaction: null,
      trace: null,
    });
  });

  it('does not send a second request while a submit is in progress', async () => {
    const api = createFakeApi();
    const store = createLedgerStore(api);
    const first = store.dispatch(
      submitTransaction({ input: { type: 'credit', amount: 1, title: 'a' } }),
    );
    const second = store.dispatch(
      submitTransaction({ input: { type: 'credit', amount: 1, title: 'a' } }),
    );
    await Promise.all([first, second]);
    expect(api.createTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('tracing of user actions', () => {
  it('uses one trace ID for the two reads of "load account"', async () => {
    const api = createFakeApi();
    const store = createLedgerStore(api);
    await store.dispatch(fetchAccount());
    const balanceTrace = api.getBalance.mock.calls[0]?.[0]?.traceId;
    const listTrace = api.getRecentTransactions.mock.calls[0]?.[1]?.traceId;
    expect(balanceTrace).toMatch(/^[0-9a-f]{32}$/);
    expect(listTrace).toBe(balanceTrace);
  });

  it('stores the trace on success; the server copy is on the transaction', async () => {
    const store = createLedgerStore(createFakeApi());
    await store.dispatch(submitTransaction({ input: { type: 'credit', amount: 5, title: 'Pay' } }));
    const { submit } = store.getState().account;
    expect(submit.trace?.durationMs).toBeGreaterThanOrEqual(0);
    expect(submit.lastTransaction?.traceId).toBe(submit.trace?.traceId);
  });

  it('gives each user action a new trace ID', async () => {
    const store = createLedgerStore(createFakeApi());
    await store.dispatch(submitTransaction({ input: { type: 'credit', amount: 5, title: 'a' } }));
    const first = store.getState().account.submit.trace?.traceId;
    await store.dispatch(submitTransaction({ input: { type: 'credit', amount: 5, title: 'b' } }));
    expect(store.getState().account.submit.trace?.traceId).not.toBe(first);
  });
});

describe('markets slice', () => {
  it('adds a symbol only once and removes it', () => {
    const store = createLedgerStore(createFakeApi());
    store.dispatch(symbolAdded('pfe'));
    store.dispatch(symbolAdded('PFE'));
    expect(store.getState().markets.watchlist.filter((symbol) => symbol === 'PFE')).toHaveLength(1);
    store.dispatch(symbolRemoved('PFE'));
    expect(store.getState().markets.watchlist).not.toContain('PFE');
  });

  it('does not add more than the maximum number of symbols', () => {
    const store = createLedgerStore(createFakeApi());
    for (const symbol of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'])
      store.dispatch(symbolAdded(symbol));
    expect(store.getState().markets.watchlist).toHaveLength(MAX_WATCHLIST_LENGTH);
  });
});

describe('transaction draft slice', () => {
  it('keeps typed values and clears them after a successful submit, but keeps the type', async () => {
    const store = createLedgerStore(createFakeApi());
    store.dispatch(draftFieldChanged('type', 'credit'));
    store.dispatch(draftFieldChanged('title', 'Salary'));
    store.dispatch(draftFieldChanged('amount', '100'));
    expect(store.getState().transactionDraft).toMatchObject({
      type: 'credit',
      title: 'Salary',
      amount: '100',
    });

    await store.dispatch(
      submitTransaction({ input: { type: 'credit', amount: 100, title: 'Salary' } }),
    );
    const { idempotencyKey, ...values } = store.getState().transactionDraft;
    expect(values).toEqual({ ...EMPTY_DRAFT, type: 'credit' });
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps the values when the server refuses the transaction', async () => {
    const store = createLedgerStore(createFakeApi(0));
    store.dispatch(draftFieldChanged('title', 'Laptop'));
    await store.dispatch(
      submitTransaction({ input: { type: 'debit', amount: 900, title: 'Laptop' } }),
    );
    expect(store.getState().transactionDraft.title).toBe('Laptop');
  });
});

describe('safe retry of a write (idempotency key)', () => {
  const KEY = '6f1c2a3e-8b4d-4f0a-9c1e-2d3b4a5c6d7e';
  const input = { type: 'credit', amount: 5, title: 'Pay' } as const;

  it('retries a timeout with the same key and the same trace ID', async () => {
    const api = createFakeApi();
    api.createTransaction.mockRejectedValueOnce(new ApiError('TIMEOUT', 'No answer.'));
    const store = createLedgerStore(api, undefined, { writeRetryDelaysMs: [0, 0] });
    await store.dispatch(submitTransaction({ input, idempotencyKey: KEY }));

    expect(api.createTransaction).toHaveBeenCalledTimes(2);
    const [first, second] = api.createTransaction.mock.calls.map((call) => call[1]);
    expect(first?.idempotencyKey).toBe(KEY);
    expect(second?.idempotencyKey).toBe(KEY);
    expect(second?.traceId).toBe(first?.traceId);
    const { submit } = store.getState().account;
    expect(submit.status).toBe('succeeded');
    expect(submit.trace?.attempts).toBe(2);
  });

  it('stops after the last retry and shows the error', async () => {
    const api = createFakeApi();
    api.createTransaction.mockRejectedValue(new ApiError('NETWORK_ERROR', 'No connection.'));
    const store = createLedgerStore(api, undefined, { writeRetryDelaysMs: [0, 0] });
    await store.dispatch(submitTransaction({ input }));
    expect(api.createTransaction).toHaveBeenCalledTimes(3);
    expect(store.getState().account.submit).toMatchObject({
      status: 'failed',
      error: { code: 'NETWORK_ERROR' },
      trace: { attempts: 3 },
    });
  });

  it('does not retry a business error', async () => {
    const api = createFakeApi(0);
    const store = createLedgerStore(api, undefined, { writeRetryDelaysMs: [0, 0] });
    await store.dispatch(submitTransaction({ input: { ...input, type: 'debit' } }));
    expect(api.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft key until a value changes or the submit succeeds', async () => {
    const api = createFakeApi(0);
    const store = createLedgerStore(api, undefined, { writeRetryDelaysMs: [] });
    const initial = store.getState().transactionDraft.idempotencyKey;

    store.dispatch(draftFieldChanged('title', 'Rent'));
    const afterEdit = store.getState().transactionDraft.idempotencyKey;
    expect(afterEdit).not.toBe(initial);
    store.dispatch(draftFieldChanged('title', 'Rent'));
    expect(store.getState().transactionDraft.idempotencyKey).toBe(afterEdit);

    // A refused submit keeps the key: the user can try the same transaction again.
    await store.dispatch(submitTransaction({ input: { ...input, type: 'debit' } }));
    expect(store.getState().transactionDraft.idempotencyKey).toBe(afterEdit);

    await store.dispatch(submitTransaction({ input }));
    expect(store.getState().transactionDraft.idempotencyKey).not.toBe(afterEdit);
  });
});

describe('fetchAccount cancellation', () => {
  it('does not show an error when the request is cancelled', async () => {
    const store = createLedgerStore(createFakeApi());
    const request = store.dispatch(fetchAccount());
    request.abort();
    await request;
    expect(store.getState().account.load).toEqual({ status: 'idle', error: null });
  });
});
