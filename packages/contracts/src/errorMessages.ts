import { fromCents } from './money';

/**
 * Messages for the business refusals of the API. The server sends them in
 * `error.message`. The test fake in `@ledger/core/testing` uses the same
 * functions, so the fake and the server cannot show different text.
 */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** `INSUFFICIENT_FUNDS`: the debit makes the balance less than 0. */
export function insufficientFundsMessage(availableCents: number): string {
  return `The transaction is refused. The balance cannot go below ${usd.format(0)}. Available balance: ${usd.format(fromCents(availableCents))}.`;
}

/** `IDEMPOTENCY_KEY_REUSED`: the key belongs to a transaction with different data. */
export const IDEMPOTENCY_KEY_REUSED_MESSAGE =
  'The server already recorded a different transaction with this request key. Submit the form again.';
