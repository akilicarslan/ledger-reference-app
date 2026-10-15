import type { ErrorCode } from '@ledger/contracts';

/** Error codes that only the client creates. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';
export type AppErrorCode = ErrorCode | ClientErrorCode;

/** Client view of one traced user action. */
export interface ClientTrace {
  /** The W3C trace ID. The UI shows it as the "Reference ID". */
  traceId: string;
  /** When the client started the action (ISO 8601). */
  startedAt: string;
  /** Time from the start of the action to the last response, in milliseconds. */
  durationMs: number;
  /** Number of HTTP attempts. More than 1 when the client retried a temporary failure. */
  attempts?: number;
}

/** Serializable error. Redux state and UI props use this shape. */
export interface AppError {
  code: AppErrorCode;
  message: string;
  /** The trace ID of the failed request, if a request was sent. */
  traceId?: string;
  /** Set by thunks that trace a full user action. */
  trace?: ClientTrace;
}

export class ApiError extends Error implements AppError {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Messages for errors that the client creates. Written in ASD-STE100 style. */
export const CLIENT_ERROR_MESSAGES: Record<ClientErrorCode, string> = {
  NETWORK_ERROR:
    'The app cannot connect to the server. Make sure that the server operates, then try again.',
  TIMEOUT: 'The server did not answer in time. Try again.',
  INVALID_RESPONSE: 'The server sent data that the app cannot read.',
};

const RETRYABLE: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT',
]);

/** A retry can help for temporary failures. It cannot help for business or validation errors. */
export function isRetryable(error: AppError): boolean {
  return RETRYABLE.has(error.code);
}

export function toAppError(error: unknown): AppError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.traceId ? { traceId: error.traceId } : {}),
    };
  }
  return { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Try again.' };
}
