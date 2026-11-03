import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  IDEMPOTENCY_KEY_REUSED_MESSAGE,
  insufficientFundsMessage,
  type ErrorBody,
  type ErrorCode,
} from '@ledger/contracts';
import { IdempotencyKeyReusedError, InsufficientFundsError } from '../domain/ledger';
import { traceFailure } from '../tracing/ledgerEvents';
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

export function toErrorBody(error: unknown): ErrorBody {
  if (error instanceof InsufficientFundsError) {
    return {
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: insufficientFundsMessage(error.availableCents),
      },
    };
  }
  if (error instanceof IdempotencyKeyReusedError) {
    return {
      error: {
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: IDEMPOTENCY_KEY_REUSED_MESSAGE,
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
      traceFailure(trace, error, body);
    }
    if (body.error.code === 'INTERNAL_ERROR') {
      log(
        `[error] traceId=${trace?.traceId ?? '-'} ${req.method} ${req.originalUrl}: ${error instanceof Error ? error.stack : String(error)}`,
      );
    }
    res.status(ERROR_STATUS).json(body);
  };
}
