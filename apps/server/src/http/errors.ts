import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { fromCents, type ErrorBody, type ErrorCode } from '@ledger/contracts';
import { IdempotencyKeyReusedError, InsufficientFundsError } from '../domain/ledger';
import type { RequestTrace } from '../tracing/requestTrace';

/** A failure that the API reports with a known error code. */
export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * The assignment allows only "200 OK" and "500 Internal Server Error".
 * All errors therefore use status 500. The body has a stable `error.code`.
 */
export const ERROR_STATUS = 500;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function toErrorBody(error: unknown): ErrorBody {
  if (error instanceof InsufficientFundsError) {
    return {
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: `The transaction is refused. The balance cannot go below ${usd.format(0)}. Available balance: ${usd.format(fromCents(error.availableCents))}.`,
      },
    };
  }
  if (error instanceof IdempotencyKeyReusedError) {
    return {
      error: {
        code: 'IDEMPOTENCY_KEY_REUSED',
        message:
          'The server already recorded a different transaction with this request key. Submit the form again.',
      },
    };
  }
  if (error instanceof ZodError) {
    return {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The request data is not correct.',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }
  if (error instanceof HttpError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }
  // Body parser errors (bad JSON, body too large) have a `type` property.
  if (isBodyParserError(error)) {
    return {
      error: {
        code: 'VALIDATION_FAILED',
        message:
          error.type === 'entity.too.large'
            ? 'The request body is too large.'
            : 'The request body is not valid JSON.',
      },
    };
  }
  return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Try again.' } };
}

function isBodyParserError(error: unknown): error is { type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as { type: unknown }).type === 'string' &&
    String((error as { type: string }).type).startsWith('entity.')
  );
}

export function errorHandler(log: (message: string) => void): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const body = toErrorBody(error);
    const trace = res.locals.trace as RequestTrace | undefined;
    if (trace) {
      body.error.traceId = trace.traceId;
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
    if (body.error.code === 'INTERNAL_ERROR') {
      log(
        `[error] traceId=${trace?.traceId ?? '-'} ${req.method} ${req.originalUrl}: ${error instanceof Error ? error.stack : String(error)}`,
      );
    }
    res.status(ERROR_STATUS).json(body);
  };
}
