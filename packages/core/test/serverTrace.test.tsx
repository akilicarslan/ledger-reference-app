import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Trace, TraceEvent, TraceEventName } from '@ledger/contracts';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from '../src/api/ApiProvider';
import {
  TRACE_MAX_RELOADS,
  TRACE_RELOAD_INTERVAL_MS,
  useServerTrace,
} from '../src/diagnostics/useServerTrace';
import { createSpiedApi } from './fakes';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';

function traceOf(...names: TraceEventName[]): Trace {
  const events: TraceEvent[] = names.map((name) => ({
    traceId: TRACE_ID,
    spanId: '00f067aa0ba902b7',
    name,
    at: '2026-10-13T09:00:00.000Z',
    attributes: {},
  }));
  return { traceId: TRACE_ID, events };
}

function wrapperFor(api: ReturnType<typeof createSpiedApi>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <ApiProvider api={api}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ApiProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useServerTrace', () => {
  it('reads the trace again until the server adds http.response.sent', async () => {
    const api = createSpiedApi();
    api.getTrace
      .mockResolvedValueOnce(traceOf('http.request.received', 'ledger.transaction.recorded'))
      .mockResolvedValue(
        traceOf('http.request.received', 'ledger.transaction.recorded', 'http.response.sent'),
      );
    const { result } = renderHook(() => useServerTrace(TRACE_ID), { wrapper: wrapperFor(api) });

    await waitFor(() =>
      expect(result.current.events.map((event) => event.name)).toContain('http.response.sent'),
    );
    expect(api.getTrace).toHaveBeenCalledTimes(2);
  });

  it('does not read a complete trace again', async () => {
    vi.useFakeTimers();
    const api = createSpiedApi();
    api.getTrace.mockResolvedValue(traceOf('http.request.received', 'http.response.sent'));
    renderHook(() => useServerTrace(TRACE_ID), { wrapper: wrapperFor(api) });

    await act(() => vi.advanceTimersByTimeAsync(TRACE_RELOAD_INTERVAL_MS * 10));
    expect(api.getTrace).toHaveBeenCalledTimes(1);
  });

  it('stops after TRACE_MAX_RELOADS reads when the trace stays incomplete', async () => {
    vi.useFakeTimers();
    const api = createSpiedApi();
    api.getTrace.mockResolvedValue(traceOf('http.request.received'));
    renderHook(() => useServerTrace(TRACE_ID), { wrapper: wrapperFor(api) });

    await act(() =>
      vi.advanceTimersByTimeAsync(TRACE_RELOAD_INTERVAL_MS * (TRACE_MAX_RELOADS + 5)),
    );
    expect(api.getTrace).toHaveBeenCalledTimes(1 + TRACE_MAX_RELOADS);
  });
});
