import type { Balance } from '@ledger/contracts';
import { vi } from 'vitest';
import type { ApiClient } from '../src/api/client';
import { FAKE_NOW, createFakeApi } from '../src/testing';

export const NOW = FAKE_NOW;

export function balance(amount: number): Balance {
  return { amount, currency: 'USD', updatedAt: NOW };
}

/**
 * The shared fake API (`@ledger/core/testing`) with a `vi.fn` spy on each
 * method, so a test can check the calls or override one call.
 */
export function createSpiedApi(initialBalance = 0) {
  const fake = createFakeApi({ initialBalance });
  return {
    getBalance: vi.fn(fake.getBalance),
    getRecentTransactions: vi.fn(fake.getRecentTransactions),
    createTransaction: vi.fn(fake.createTransaction),
    getStockQuotes: vi.fn(fake.getStockQuotes),
    searchStocks: vi.fn(fake.searchStocks),
    getTrace: vi.fn(fake.getTrace),
  } satisfies ApiClient;
}
