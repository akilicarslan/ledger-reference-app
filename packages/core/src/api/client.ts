import {
  Balance,
  CreateTransactionResult,
  ErrorBody,
  StockQuoteList,
  StockSearchResult,
  Trace,
  TransactionList,
  RECENT_TRANSACTIONS_DEFAULT_LIMIT,
  IDEMPOTENCY_KEY_HEADER,
  TRACEPARENT_HEADER,
  formatTraceparent,
  newTraceContext,
  type NewTransactionInput,
  type StockQuote,
  type Transaction,
} from '@ledger/contracts';
import type { z } from 'zod';
import { ApiError, CLIENT_ERROR_MESSAGES } from './errors';

export interface RequestOptions {
  signal?: AbortSignal;
  /**
   * Trace ID of the user action. All requests of one action (for example the
   * two reads of "load account") use the same trace ID. If you do not give
   * one, the request starts a new trace.
   */
  traceId?: string;
  /**
   * Only for writes. Send the same key when you retry the same write, so the
   * server does not record it two times (see @ledger/contracts idempotency.ts).
   */
  idempotencyKey?: string;
}

export interface ApiClient {
  getBalance(options?: RequestOptions): Promise<Balance>;
  getRecentTransactions(limit?: number, options?: RequestOptions): Promise<Transaction[]>;
  createTransaction(
    input: NewTransactionInput,
    options?: RequestOptions,
  ): Promise<CreateTransactionResult>;
  getStockQuotes(symbols: readonly string[], options?: RequestOptions): Promise<StockQuote[]>;
  searchStocks(text: string, options?: RequestOptions): Promise<StockSearchResult['results']>;
  /** Reads the server events of one trace (diagnostics). */
  getTrace(traceId: string, options?: RequestOptions): Promise<Trace>;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Typed HTTP client.
 * - It validates every response with the Zod schema from @ledger/contracts,
 *   so the UI never receives data with an unknown shape.
 * - It sends a W3C `traceparent` header with a new span for each request.
 */
export function createApiClient({
  baseUrl,
  fetchFn = (...args) => fetch(...args),
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ApiClientOptions): ApiClient {
  const root = `${baseUrl.replace(/\/+$/, '')}/api/v1`;

  async function request<S extends z.ZodType>(
    path: string,
    schema: S,
    init: RequestInit = {},
    { signal, traceId, idempotencyKey }: RequestOptions = {},
  ): Promise<z.output<S>> {
    const span = newTraceContext(traceId);

    // Hermes does not have AbortSignal.any(), so we link the signals manually.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    signal?.addEventListener('abort', onCallerAbort);

    let response: Response;
    try {
      response = await fetchFn(`${root}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          [TRACEPARENT_HEADER]: formatTraceparent(span),
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(idempotencyKey ? { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } : {}),
        },
        signal: controller.signal,
      });
    } catch (cause) {
      if (signal?.aborted) throw cause; // The caller cancelled the request (for example React Query).
      const code = timedOut ? 'TIMEOUT' : 'NETWORK_ERROR';
      throw new ApiError(code, CLIENT_ERROR_MESSAGES[code], span.traceId);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
    }

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const parsedError = ErrorBody.safeParse(body);
      if (parsedError.success) {
        const { code, message, traceId: serverTraceId } = parsedError.data.error;
        throw new ApiError(code, message, serverTraceId ?? span.traceId);
      }
      throw new ApiError(
        'INTERNAL_ERROR',
        `The server sent an error (HTTP ${response.status}). Try again.`,
        span.traceId,
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('INVALID_RESPONSE', CLIENT_ERROR_MESSAGES.INVALID_RESPONSE, span.traceId);
    }
    return parsed.data;
  }

  return {
    getBalance: (options) => request('/balance', Balance, {}, options),
    getRecentTransactions: async (limit = RECENT_TRANSACTIONS_DEFAULT_LIMIT, options) =>
      (await request(`/transactions?limit=${limit}`, TransactionList, {}, options)).items,
    createTransaction: (input, options) =>
      request(
        '/transactions',
        CreateTransactionResult,
        { method: 'POST', body: JSON.stringify(input) },
        options,
      ),
    getStockQuotes: async (symbols, options) =>
      (
        await request(
          `/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}`,
          StockQuoteList,
          {},
          options,
        )
      ).quotes,
    searchStocks: async (text, options) =>
      (
        await request(
          `/stocks/search?q=${encodeURIComponent(text)}`,
          StockSearchResult,
          {},
          options,
        )
      ).results,
    getTrace: (traceId, options) =>
      request(`/traces/${encodeURIComponent(traceId)}`, Trace, {}, options),
  };
}
