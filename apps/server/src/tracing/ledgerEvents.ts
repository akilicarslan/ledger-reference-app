import type { ErrorBody, NewTransaction, Transaction } from '@ledger/contracts';
import { IdempotencyKeyReusedError, InsufficientFundsError } from '../domain/ledger';
import type { RequestTrace } from './requestTrace';

/**
 * Maps each outcome of a ledger write to its trace events. The write route
 * and the error handler report the outcome here. They do not choose event
 * names or attributes, so each outcome always gets the same events.
 */

/** The body of the write agrees with the schema. */
export function traceWriteAccepted(
  trace: RequestTrace,
  input: NewTransaction,
  idempotencyKey: string | undefined,
): void {
  trace.event('validation.passed', {
    type: input.type,
    hasReceiptImage: Boolean(input.receiptImage),
    hasIdempotencyKey: Boolean(idempotencyKey),
  });
}

/** The ledger recorded the transaction, or already had it (a safe retry). */
export function traceWriteResult(
  trace: RequestTrace,
  { transaction, replayed }: { transaction: Transaction; replayed: boolean },
  durationMs: number,
): void {
  if (replayed) {
    // A retry of a write that the server already did. Nothing changed.
    trace.event('ledger.transaction.replayed', {
      transactionId: transaction.id,
      originalTraceId: transaction.traceId,
    });
    return;
  }
  trace.event(
    'ledger.transaction.recorded',
    {
      transactionId: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
    },
    durationMs,
  );
}

/** The request failed: the event of the cause (when it is known), then `http.error`. */
export function traceFailure(trace: RequestTrace, error: unknown, body: ErrorBody): void {
  if (error instanceof InsufficientFundsError) {
    trace.event('ledger.transaction.refused', {
      reason: 'INSUFFICIENT_FUNDS',
      availableCents: error.availableCents,
      requestedCents: error.requestedCents,
    });
  } else if (error instanceof IdempotencyKeyReusedError) {
    trace.event('ledger.idempotency.conflict', { transactionId: error.transactionId });
  } else if (body.error.code === 'VALIDATION_FAILED') {
    trace.event('validation.failed', { issues: body.error.details?.length ?? 1 });
  }
  trace.event('http.error', { code: body.error.code });
}
