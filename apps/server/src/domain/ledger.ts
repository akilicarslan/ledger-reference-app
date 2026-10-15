import { fromCents, toCents } from '@ledger/contracts';
import type { Balance, NewTransaction, Transaction } from '@ledger/contracts';
import type { LedgerFile, LedgerRepository } from '../store/ledgerRepository';

/** The transaction would make the balance less than 0. */
export class InsufficientFundsError extends Error {
  constructor(
    readonly availableCents: number,
    readonly requestedCents: number,
  ) {
    super('Insufficient funds');
    this.name = 'InsufficientFundsError';
  }
}

/** The idempotency key is already used for a transaction with different data. */
export class IdempotencyKeyReusedError extends Error {
  constructor(readonly transactionId: string) {
    super('Idempotency key reused');
    this.name = 'IdempotencyKeyReusedError';
  }
}

/** The stored data breaks a ledger rule (for example a wrong `balanceAfter`). */
export class LedgerIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerIntegrityError';
  }
}

export interface LedgerDeps {
  now: () => Date;
  newId: () => string;
  repository: LedgerRepository;
  /** Used only when the repository is empty. */
  initialBalanceCents?: number;
}

/**
 * The ledger rules. It keeps the balance in integer cents, so floating-point
 * errors cannot add up. Node.js runs JavaScript on one thread, and `record` is
 * synchronous (also the file write), so two requests cannot change the
 * balance at the same time.
 */
export class Ledger {
  private readonly openingBalanceCents: number;
  private balanceCents: number;
  private updatedAt: Date;
  private readonly transactions: Transaction[];
  /** Idempotency key → transaction. Built from the stored file, so it survives a restart. */
  private readonly byIdempotencyKey = new Map<string, Transaction>();

  constructor(private readonly deps: LedgerDeps) {
    const stored = deps.repository.load();
    this.openingBalanceCents = stored?.openingBalanceCents ?? deps.initialBalanceCents ?? 0;
    this.transactions = stored?.transactions ?? [];
    this.balanceCents = Ledger.verify(this.openingBalanceCents, this.transactions);
    this.updatedAt = stored ? new Date(stored.updatedAt) : deps.now();
    for (const transaction of this.transactions) {
      if (transaction.idempotencyKey)
        this.byIdempotencyKey.set(transaction.idempotencyKey, transaction);
    }
  }

  /**
   * Replays all transactions and checks each `balanceAfter`.
   * A changed or damaged data file stops the server at start-up.
   */
  private static verify(openingBalanceCents: number, transactions: readonly Transaction[]): number {
    let balance = openingBalanceCents;
    for (const transaction of transactions) {
      balance += (transaction.type === 'credit' ? 1 : -1) * toCents(transaction.amount);
      if (balance < 0) {
        throw new LedgerIntegrityError(`Transaction ${transaction.id} makes the balance negative.`);
      }
      if (balance !== toCents(transaction.balanceAfter)) {
        throw new LedgerIntegrityError(
          `Transaction ${transaction.id} has balanceAfter ${transaction.balanceAfter}, expected ${fromCents(balance)}.`,
        );
      }
    }
    return balance;
  }

  getBalance(): Balance {
    return {
      amount: fromCents(this.balanceCents),
      currency: 'USD',
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /** Returns the newest transactions first. */
  getRecent(limit: number): Transaction[] {
    return this.transactions.slice(-limit).reverse();
  }

  get transactionCount(): number {
    return this.transactions.length;
  }

  /**
   * Records one transaction and saves the ledger.
   *
   * With an idempotency key that the ledger already has, it records nothing
   * and returns the stored transaction with `replayed: true`. The balance in
   * the result is the current balance.
   *
   * @throws InsufficientFundsError when a debit makes the balance less than 0.
   * @throws IdempotencyKeyReusedError when the key belongs to a transaction with different data.
   */
  record(
    input: NewTransaction,
    meta: { traceId: string; idempotencyKey?: string },
  ): { transaction: Transaction; balance: Balance; replayed: boolean } {
    const previous = meta.idempotencyKey
      ? this.byIdempotencyKey.get(meta.idempotencyKey)
      : undefined;
    if (previous) {
      if (!Ledger.sameRequest(previous, input)) throw new IdempotencyKeyReusedError(previous.id);
      return { transaction: previous, balance: this.getBalance(), replayed: true };
    }

    const amountCents = toCents(input.amount);
    const delta = input.type === 'credit' ? amountCents : -amountCents;
    const nextBalanceCents = this.balanceCents + delta;

    if (nextBalanceCents < 0) {
      throw new InsufficientFundsError(this.balanceCents, amountCents);
    }

    const now = this.deps.now();
    const transaction: Transaction = {
      id: this.deps.newId(),
      type: input.type,
      amount: fromCents(amountCents),
      title: input.title,
      description: input.description,
      dateTime: input.dateTime ?? now.toISOString(),
      receiptImage: input.receiptImage ?? null,
      balanceAfter: fromCents(nextBalanceCents),
      traceId: meta.traceId,
      ...(meta.idempotencyKey ? { idempotencyKey: meta.idempotencyKey } : {}),
    };

    // Save first. If the write fails, the in-memory state stays unchanged.
    this.deps.repository.save(this.snapshot([...this.transactions, transaction], now));
    this.transactions.push(transaction);
    this.balanceCents = nextBalanceCents;
    this.updatedAt = now;
    if (meta.idempotencyKey) this.byIdempotencyKey.set(meta.idempotencyKey, transaction);
    return { transaction, balance: this.getBalance(), replayed: false };
  }

  /** True when a retry sends the same data as the stored transaction. */
  private static sameRequest(stored: Transaction, input: NewTransaction): boolean {
    return (
      stored.type === input.type &&
      toCents(stored.amount) === toCents(input.amount) &&
      stored.title === input.title &&
      stored.description === input.description &&
      stored.receiptImage === (input.receiptImage ?? null) &&
      (input.dateTime === undefined || stored.dateTime === input.dateTime)
    );
  }

  private snapshot(transactions: Transaction[], updatedAt: Date): LedgerFile {
    return {
      version: 1,
      currency: 'USD',
      openingBalanceCents: this.openingBalanceCents,
      updatedAt: updatedAt.toISOString(),
      transactions,
    };
  }
}
