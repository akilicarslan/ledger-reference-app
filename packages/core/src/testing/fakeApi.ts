import {
  IDEMPOTENCY_KEY_REUSED_MESSAGE,
  NewTransaction,
  RECENT_TRANSACTIONS_DEFAULT_LIMIT,
  fromCents,
  insufficientFundsMessage,
  toCents,
  type Balance,
  type CreateTransactionResult,
  type NewTransactionInput,
  type TraceEvent,
  type TraceEventName,
  type Transaction,
} from '@ledger/contracts';
import type { ApiClient, RequestOptions } from '../api/client';
import { ApiError } from '../api/errors';

/** The clock of the fake. All balances and transactions use this time. */
export const FAKE_NOW = '2026-10-13T09:00:00.000Z';

const FAKE_TRACE_ID = 'f'.repeat(32);
const FAKE_SPAN_ID = '00f067aa0ba902b7';

export interface FakeApiOptions {
  /** The opening balance (decimal amount, for example 12.5). Default 0. */
  initialBalance?: number;
}

/**
 * An in-memory `ApiClient` with the rules of the server:
 *
 * - The balance cannot go below 0. The refusal has the server message
 *   (`insufficientFundsMessage` from @ledger/contracts).
 * - A retry with a known idempotency key returns the stored transaction and
 *   records nothing. The same key with different data is refused.
 * - Each write records the server trace events under the trace ID of the
 *   request. `getTrace` returns them. Reads record no events.
 *
 * It has no dependency on a test runner, so Vitest and Jest suites can use it.
 * To spy on a method, wrap it (`vi.fn(api.getBalance)`) or replace it.
 */
export function createFakeApi({ initialBalance = 0 }: FakeApiOptions = {}): ApiClient {
  let balanceCents = toCents(initialBalance);
  const items: Transaction[] = [];
  const byIdempotencyKey = new Map<string, Transaction>();
  const events: TraceEvent[] = [];

  const balance = (): Balance => ({
    amount: fromCents(balanceCents),
    currency: 'USD',
    updatedAt: FAKE_NOW,
  });

  function write(
    input: NewTransactionInput,
    { traceId = FAKE_TRACE_ID, idempotencyKey }: RequestOptions = {},
  ): CreateTransactionResult {
    let step = 0;
    let status = 200;
    const event = (name: TraceEventName, attributes: TraceEvent['attributes'] = {}) => {
      events.push({
        traceId,
        spanId: FAKE_SPAN_ID,
        name,
        at: FAKE_NOW,
        attributes: { ...attributes, elapsedMs: step },
      });
      step += 0.2;
    };
    const refuse = (
      error: ApiError,
      name: TraceEventName,
      attributes: TraceEvent['attributes'],
    ) => {
      event(name, attributes);
      event('http.error', { code: error.code });
      status = 500;
      return error;
    };

    event('http.request.received', { method: 'POST', path: '/api/v1/transactions' });
    try {
      const parsed = NewTransaction.safeParse(input);
      if (!parsed.success) {
        throw refuse(
          new ApiError('VALIDATION_FAILED', 'The request data is not correct.', traceId),
          'validation.failed',
          { issues: parsed.error.issues.length },
        );
      }
      const data = parsed.data;
      event('validation.passed', {
        type: data.type,
        hasReceiptImage: Boolean(data.receiptImage),
        hasIdempotencyKey: Boolean(idempotencyKey),
      });

      const previous = idempotencyKey ? byIdempotencyKey.get(idempotencyKey) : undefined;
      if (previous) {
        if (!sameRequest(previous, data)) {
          throw refuse(
            new ApiError('IDEMPOTENCY_KEY_REUSED', IDEMPOTENCY_KEY_REUSED_MESSAGE, traceId),
            'ledger.idempotency.conflict',
            { transactionId: previous.id },
          );
        }
        event('ledger.transaction.replayed', {
          transactionId: previous.id,
          originalTraceId: previous.traceId,
        });
        return { transaction: previous, balance: balance() };
      }

      const amountCents = toCents(data.amount);
      const next = balanceCents + (data.type === 'credit' ? amountCents : -amountCents);
      if (next < 0) {
        throw refuse(
          new ApiError('INSUFFICIENT_FUNDS', insufficientFundsMessage(balanceCents), traceId),
          'ledger.transaction.refused',
          {
            reason: 'INSUFFICIENT_FUNDS',
            availableCents: balanceCents,
            requestedCents: amountCents,
          },
        );
      }

      balanceCents = next;
      const transaction: Transaction = {
        id: `00000000-0000-4000-8000-${String(items.length + 1).padStart(12, '0')}`,
        type: data.type,
        amount: fromCents(amountCents),
        title: data.title,
        description: data.description,
        dateTime: data.dateTime ?? FAKE_NOW,
        receiptImage: data.receiptImage ?? null,
        balanceAfter: fromCents(balanceCents),
        traceId,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      };
      items.unshift(transaction);
      if (idempotencyKey) byIdempotencyKey.set(idempotencyKey, transaction);
      event('ledger.transaction.recorded', {
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
      });
      return { transaction, balance: balance() };
    } finally {
      event('http.response.sent', { status });
    }
  }

  return {
    getBalance: async () => balance(),
    getRecentTransactions: async (limit = RECENT_TRANSACTIONS_DEFAULT_LIMIT) =>
      items.slice(0, limit),
    createTransaction: async (input, options) => write(input, options),
    getStockQuotes: async () => [],
    searchStocks: async () => [],
    getTrace: async (traceId) => ({
      traceId,
      events: events.filter((event) => event.traceId === traceId),
    }),
  };
}

/** The same comparison as the server ledger: a retry must send the same data. */
function sameRequest(stored: Transaction, input: NewTransaction): boolean {
  return (
    stored.type === input.type &&
    toCents(stored.amount) === toCents(input.amount) &&
    stored.title === input.title &&
    stored.description === input.description &&
    stored.receiptImage === (input.receiptImage ?? null) &&
    (input.dateTime === undefined || stored.dateTime === input.dateTime)
  );
}
