import { describe, expect, it } from 'vitest';
import {
  Amount,
  ErrorBody,
  NewTransaction,
  RecentTransactionsQuery,
  StockQuotesQuery,
  fromCents,
  hasAtMostTwoDecimals,
  toCents,
} from '../src';

describe('Amount', () => {
  it.each([0.01, 0.1, 0.3, 19.99, 1234.56, 1_000_000_000])('accepts %s', (value) => {
    expect(Amount.safeParse(value).success).toBe(true);
  });

  it.each([0, -1, 12.345, 1_000_000_000.01, Number.NaN])('refuses %s', (value) => {
    expect(Amount.safeParse(value).success).toBe(false);
  });
});

describe('NewTransaction', () => {
  it('trims the title and gives a default empty description', () => {
    expect(NewTransaction.parse({ type: 'debit', amount: 5, title: '  Lunch  ' })).toEqual({
      type: 'debit',
      amount: 5,
      title: 'Lunch',
      description: '',
    });
  });

  it('refuses an unknown type and an empty title', () => {
    const result = NewTransaction.safeParse({ type: 'refund', amount: 5, title: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['type', 'title']);
  });

  it('accepts a base64 image data URI and refuses other text', () => {
    const base = { type: 'debit', amount: 1, title: 'Receipt' } as const;
    expect(
      NewTransaction.safeParse({ ...base, receiptImage: 'data:image/jpeg;base64,/9j/4AAQ==' })
        .success,
    ).toBe(true);
    expect(
      NewTransaction.safeParse({ ...base, receiptImage: 'https://example.com/a.png' }).success,
    ).toBe(false);
  });

  it('refuses a date-time that is not ISO 8601', () => {
    const result = NewTransaction.safeParse({
      type: 'credit',
      amount: 1,
      title: 'x',
      dateTime: '13/10/2026',
    });
    expect(result.success).toBe(false);
  });
});

describe('query schemas', () => {
  it('uses limit 5 when the client does not send a limit', () => {
    expect(RecentTransactionsQuery.parse({})).toEqual({ limit: 5 });
    expect(RecentTransactionsQuery.parse({ limit: '3' })).toEqual({ limit: 3 });
    expect(RecentTransactionsQuery.safeParse({ limit: '0' }).success).toBe(false);
  });

  it('splits and normalizes a symbol list', () => {
    expect(StockQuotesQuery.parse({ symbols: 'aapl, msft,,' })).toEqual({
      symbols: ['AAPL', 'MSFT'],
    });
    expect(StockQuotesQuery.safeParse({ symbols: '' }).success).toBe(false);
  });
});

describe('ErrorBody', () => {
  it('accepts the documented error shape', () => {
    expect(
      ErrorBody.safeParse({ error: { code: 'INSUFFICIENT_FUNDS', message: 'Refused' } }).success,
    ).toBe(true);
    expect(ErrorBody.safeParse({ error: { code: 'TEAPOT', message: 'x' } }).success).toBe(false);
  });
});

describe('money helpers', () => {
  it('converts between decimal amounts and integer cents without drift', () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
    expect(fromCents(toCents(19.99))).toBe(19.99);
    expect(hasAtMostTwoDecimals(10.25)).toBe(true);
    expect(hasAtMostTwoDecimals(10.255)).toBe(false);
  });
});
