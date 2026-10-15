import { describe, expect, it } from 'vitest';
import { InsufficientFundsError, LedgerIntegrityError } from '../src/domain/ledger';
import { InMemoryLedgerRepository } from '../src/store/ledgerRepository';
import { FIXED_NOW, TRACE_A, newTestLedger } from './helpers';

const newLedger = () => newTestLedger();
const meta = { traceId: TRACE_A };

describe('Ledger', () => {
  it('starts with a balance of 0 and no transactions', () => {
    const ledger = newLedger();
    expect(ledger.getBalance()).toEqual({
      amount: 0,
      currency: 'USD',
      updatedAt: FIXED_NOW.toISOString(),
    });
    expect(ledger.getRecent(5)).toEqual([]);
  });

  it('adds credits and removes debits without floating-point drift', () => {
    const ledger = newLedger();
    ledger.record({ type: 'credit', amount: 0.1, title: 'a', description: '' }, meta);
    ledger.record({ type: 'credit', amount: 0.2, title: 'b', description: '' }, meta);
    const { balance, transaction } = ledger.record(
      {
        type: 'debit',
        amount: 0.3,
        title: 'c',
        description: '',
      },
      meta,
    );
    expect(balance.amount).toBe(0);
    expect(transaction.balanceAfter).toBe(0);
  });

  it('allows a debit that makes the balance exactly 0', () => {
    const ledger = newLedger();
    ledger.record({ type: 'credit', amount: 50, title: 'Pay', description: '' }, meta);
    expect(
      ledger.record({ type: 'debit', amount: 50, title: 'Rent', description: '' }, meta).balance
        .amount,
    ).toBe(0);
  });

  it('refuses a debit that makes the balance less than 0 and keeps the state', () => {
    const ledger = newLedger();
    ledger.record({ type: 'credit', amount: 10, title: 'Pay', description: '' }, meta);
    expect(() =>
      ledger.record({ type: 'debit', amount: 10.01, title: 'Too much', description: '' }, meta),
    ).toThrow(InsufficientFundsError);
    expect(ledger.getBalance().amount).toBe(10);
    expect(ledger.getRecent(5)).toHaveLength(1);
  });

  it('returns the last N transactions, newest first', () => {
    const ledger = newLedger();
    for (let index = 1; index <= 7; index += 1) {
      ledger.record({ type: 'credit', amount: index, title: `t${index}`, description: '' }, meta);
    }
    expect(ledger.getRecent(5).map((item) => item.title)).toEqual(['t7', 't6', 't5', 't4', 't3']);
  });

  it('uses the client date-time when the client sends one', () => {
    const ledger = newLedger();
    const dateTime = '2026-01-02T03:04:05.000Z';
    const { transaction } = ledger.record(
      {
        type: 'credit',
        amount: 1,
        title: 'x',
        description: '',
        dateTime,
      },
      meta,
    );
    expect(transaction.dateTime).toBe(dateTime);
  });

  it('stores the trace ID of the request on the transaction', () => {
    const { transaction } = newLedger().record(
      { type: 'credit', amount: 1, title: 'x', description: '' },
      { traceId: TRACE_A },
    );
    expect(transaction.traceId).toBe(TRACE_A);
  });
});

describe('Ledger persistence', () => {
  it('saves after each transaction and loads the same state after a restart', () => {
    const repository = new InMemoryLedgerRepository();
    const first = newTestLedger(repository);
    first.record({ type: 'credit', amount: 100, title: 'Pay', description: '' }, meta);
    first.record({ type: 'debit', amount: 30.5, title: 'Lunch', description: '' }, meta);

    const restarted = newTestLedger(repository);
    expect(restarted.getBalance().amount).toBe(69.5);
    expect(restarted.getRecent(5).map((item) => item.title)).toEqual(['Lunch', 'Pay']);
  });

  it('does not save a refused transaction', () => {
    const repository = new InMemoryLedgerRepository();
    const ledger = newTestLedger(repository);
    expect(() =>
      ledger.record({ type: 'debit', amount: 1, title: 'x', description: '' }, meta),
    ).toThrow(InsufficientFundsError);
    expect(repository.load()).toBeNull();
  });

  it('keeps the old state when the save fails', () => {
    const repository = new InMemoryLedgerRepository();
    const ledger = newTestLedger(repository);
    repository.save = () => {
      throw new Error('disk full');
    };
    expect(() =>
      ledger.record({ type: 'credit', amount: 5, title: 'x', description: '' }, meta),
    ).toThrow('disk full');
    expect(ledger.getBalance().amount).toBe(0);
    expect(ledger.getRecent(5)).toEqual([]);
  });

  it('refuses stored data with a wrong balanceAfter (integrity check at start-up)', () => {
    const repository = new InMemoryLedgerRepository();
    newTestLedger(repository).record(
      { type: 'credit', amount: 10, title: 'x', description: '' },
      meta,
    );
    const tampered = repository.load()!;
    tampered.transactions[0]!.balanceAfter = 999;
    expect(() => newTestLedger(new InMemoryLedgerRepository(tampered))).toThrow(
      LedgerIntegrityError,
    );
  });
});
