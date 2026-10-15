import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import type { StockQuote } from '@ledger/contracts';
import { useApi } from '../api/ApiProvider';
import { toAppError, type AppError } from '../api/errors';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { fallbackQuotesFor, searchFallback } from './fallback';
import { MAX_RETRIES, retryDelay, shouldRetry } from './retryPolicy';

export const SEARCH_DEBOUNCE_MS = 350;
export const QUOTES_REFETCH_INTERVAL_MS = 30_000;

export const stockKeys = {
  all: ['stocks'] as const,
  quotes: (symbols: readonly string[]) =>
    ['stocks', 'quotes', [...symbols].sort().join(',')] as const,
  search: (text: string) => ['stocks', 'search', text.toLowerCase()] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => retryDelay(attempt),
        gcTime: 5 * 60_000,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Where the shown quotes come from.
 * - `loading`: first request in progress, nothing to show yet.
 * - `live`: the last request was successful.
 * - `stale`: the last request failed; the app shows the last good data.
 * - `fallback`: all requests failed; the app shows the bundled snapshot.
 */
export type DataSource = 'loading' | 'live' | 'stale' | 'fallback';

export interface StockQuotesResult {
  quotes: StockQuote[];
  source: DataSource;
  error: AppError | null;
  isFetching: boolean;
  /** Failed attempts in the current fetch cycle. Use it to show "retry 2 of 3". */
  failureCount: number;
  maxRetries: number;
  updatedAt: number | null;
  refetch: () => void;
}

export function useStockQuotes(symbols: readonly string[]): StockQuotesResult {
  const api = useApi();
  const query = useQuery({
    queryKey: stockKeys.quotes(symbols),
    queryFn: ({ signal }) => api.getStockQuotes(symbols, { signal }),
    enabled: symbols.length > 0,
    staleTime: 15_000,
    refetchInterval: QUOTES_REFETCH_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });

  let source: DataSource = 'loading';
  let quotes: StockQuote[] = [];
  if (query.data) {
    quotes = query.data;
    source = query.isError ? 'stale' : 'live';
  } else if (query.isError) {
    quotes = fallbackQuotesFor(symbols);
    source = 'fallback';
  }

  return {
    quotes,
    source,
    error: query.error ? toAppError(query.error) : null,
    isFetching: query.isFetching,
    failureCount: query.failureCount,
    maxRetries: MAX_RETRIES,
    updatedAt: query.dataUpdatedAt || null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface StockSearchResultState {
  results: { symbol: string; name: string }[];
  /** True while the user types and the debounce timer runs. */
  isDebouncing: boolean;
  isFetching: boolean;
  /** `fallback` when the service failed and the results come from the bundled list. */
  source: 'remote' | 'fallback' | 'idle';
  error: AppError | null;
  query: string;
}

/** Debounced stock search. One request goes out after the user stops typing for SEARCH_DEBOUNCE_MS. */
export function useStockSearch(text: string): StockSearchResultState {
  const api = useApi();
  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: stockKeys.search(debounced),
    // React Query gives an AbortSignal. A new search text cancels the old request.
    queryFn: ({ signal }) => api.searchStocks(debounced, { signal }),
    enabled: debounced.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  if (!debounced) {
    return {
      results: [],
      isDebouncing: trimmed !== debounced,
      isFetching: false,
      source: 'idle',
      error: null,
      query: debounced,
    };
  }
  const failedWithoutData = query.isError && !query.data;
  return {
    results: failedWithoutData ? searchFallback(debounced) : (query.data ?? []),
    isDebouncing: trimmed !== debounced,
    isFetching: query.isFetching,
    source: failedWithoutData ? 'fallback' : 'remote',
    error: query.error ? toAppError(query.error) : null,
    query: debounced,
  };
}
