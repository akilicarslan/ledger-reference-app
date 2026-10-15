import type {
  Balance,
  NewTransactionInput,
  StockQuote,
  StockSearchResult,
  Trace,
  Transaction,
} from '@ledger/contracts';
import { vi } from 'vitest';
import type { ApiClient, RequestOptions } from '../src/api/client';
import { ApiError } from '../src/api/errors';

export const NOW = '2026-10-13T09:00:00.000Z';

export function balance(amount: number): Balance {
  return { amount, currency: 'USD', updatedAt: NOW };
}

let counter = 0;
export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    type: 'credit',
    amount: 10,
    title: `Transaction ${counter}`,
    description: '',
    dateTime: NOW,
    receiptImage: null,
    balanceAfter: 10,
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    ...overrides,
  };
}

/**
 * A small in-memory API with the same rules as the server.
 * Each method is a vi.fn, so tests can override one call.
 */
export function createFakeApi(initialBalance = 0) {
  let current = initialBalance;
  const items: Transaction[] = [];
  const api = {
    getBalance: vi.fn(async (_options?: RequestOptions) => balance(current)),
    getRecentTransactions: vi.fn(async (limit = 5, _options?: RequestOptions) =>
      items.slice(0, limit),
    ),
    createTransaction: vi.fn(async (input: NewTransactionInput, options?: RequestOptions) => {
      const next = current + (input.type === 'credit' ? input.amount : -input.amount);
      if (next < 0)
        throw new ApiError('INSUFFICIENT_FUNDS', 'The transaction is refused.', options?.traceId);
      current = next;
      const created = transaction({
        type: input.type,
        amount: input.amount,
        title: input.title,
        description: input.description ?? '',
        balanceAfter: current,
        ...(options?.traceId ? { traceId: options.traceId } : {}),
      });
      items.unshift(created);
      return { transaction: created, balance: balance(current) };
    }),
    getStockQuotes: vi.fn(async (): Promise<StockQuote[]> => []),
    searchStocks: vi.fn(async (): Promise<StockSearchResult['results']> => []),
    getTrace: vi.fn(async (traceId: string): Promise<Trace> => ({ traceId, events: [] })),
  } satisfies ApiClient;
  return api;
}
