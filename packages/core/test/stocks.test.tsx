import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ApiProvider } from '../src/api/ApiProvider';
import { ApiError } from '../src/api/errors';
import { FALLBACK_AS_OF } from '../src/stocks/fallback';
import { useStockQuotes, useStockSearch } from '../src/stocks/queries';
import { MAX_RETRIES, retryDelay, shouldRetry } from '../src/stocks/retryPolicy';
import { createFakeApi } from './fakes';

function wrapperFor(api: ReturnType<typeof createFakeApi>) {
  // No retries in these tests: the retry policy has its own unit tests below.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <ApiProvider api={api}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ApiProvider>
  );
}

const upstreamDown = new ApiError('UPSTREAM_UNAVAILABLE', 'Down.');

describe('retry policy', () => {
  it('retries temporary failures a maximum of 3 times', () => {
    expect(shouldRetry(0, upstreamDown)).toBe(true);
    expect(shouldRetry(MAX_RETRIES - 1, upstreamDown)).toBe(true);
    expect(shouldRetry(MAX_RETRIES, upstreamDown)).toBe(false);
  });

  it('does not retry business or validation errors', () => {
    expect(shouldRetry(0, new ApiError('INSUFFICIENT_FUNDS', 'x'))).toBe(false);
    expect(shouldRetry(0, new ApiError('VALIDATION_FAILED', 'x'))).toBe(false);
  });

  it('uses exponential backoff with jitter and a ceiling of 8 seconds', () => {
    expect(retryDelay(0, () => 0)).toBe(250);
    expect(retryDelay(0, () => 1)).toBe(500);
    expect(retryDelay(2, () => 1)).toBe(2000);
    expect(retryDelay(10, () => 1)).toBe(8000);
  });
});

describe('useStockQuotes', () => {
  it('shows live data after a successful request', async () => {
    const api = createFakeApi();
    api.getStockQuotes.mockResolvedValue([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 230,
        change: 1.6,
        changePercent: 0.7,
        currency: 'USD',
        asOf: '2026-10-13T09:00:00.000Z',
      },
    ]);
    const { result } = renderHook(() => useStockQuotes(['AAPL']), { wrapper: wrapperFor(api) });
    expect(result.current.source).toBe('loading');
    await waitFor(() => expect(result.current.source).toBe('live'));
    expect(result.current.quotes[0]?.price).toBe(230);
  });

  it('shows the bundled snapshot when the request fails and no data exists', async () => {
    const api = createFakeApi();
    api.getStockQuotes.mockRejectedValue(upstreamDown);
    const { result } = renderHook(() => useStockQuotes(['AAPL', 'MSFT']), {
      wrapper: wrapperFor(api),
    });
    await waitFor(() => expect(result.current.source).toBe('fallback'));
    expect(result.current.quotes.map((quote) => quote.symbol)).toEqual(['AAPL', 'MSFT']);
    expect(result.current.quotes[0]?.asOf).toBe(FALLBACK_AS_OF);
    expect(result.current.error?.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('keeps the last good data and marks it stale when a refetch fails', async () => {
    const api = createFakeApi();
    api.getStockQuotes.mockResolvedValueOnce([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 230,
        change: 0,
        changePercent: 0,
        currency: 'USD',
        asOf: '2026-10-13T09:00:00.000Z',
      },
    ]);
    const { result } = renderHook(() => useStockQuotes(['AAPL']), { wrapper: wrapperFor(api) });
    await waitFor(() => expect(result.current.source).toBe('live'));
    api.getStockQuotes.mockRejectedValue(upstreamDown);
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.source).toBe('stale'));
    expect(result.current.quotes[0]?.price).toBe(230);
  });
});

describe('useStockSearch', () => {
  it('sends one request after the user stops typing (debounce)', async () => {
    const api = createFakeApi();
    api.searchStocks.mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.' }]);
    const { result, rerender } = renderHook(({ text }) => useStockSearch(text), {
      wrapper: wrapperFor(api),
      initialProps: { text: '' },
    });
    rerender({ text: 'a' });
    rerender({ text: 'ap' });
    rerender({ text: 'app' });
    expect(result.current.isDebouncing).toBe(true);
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(api.searchStocks).toHaveBeenCalledTimes(1);
    expect(api.searchStocks).toHaveBeenCalledWith('app', { signal: expect.any(AbortSignal) });
  });

  it('searches the bundled list when the service fails', async () => {
    const api = createFakeApi();
    api.searchStocks.mockRejectedValue(upstreamDown);
    const { result } = renderHook(() => useStockSearch('pfiz'), { wrapper: wrapperFor(api) });
    await waitFor(() => expect(result.current.source).toBe('fallback'));
    expect(result.current.results).toEqual([{ symbol: 'PFE', name: 'Pfizer Inc.' }]);
  });
});
