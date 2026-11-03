import { useQuery } from '@tanstack/react-query';
import { isTraceComplete, type TraceEvent } from '@ledger/contracts';
import { useApi } from '../api/ApiProvider';
import { toAppError, type AppError } from '../api/errors';

/** Wait time before the next read of an incomplete trace. */
export const TRACE_RELOAD_INTERVAL_MS = 300;
/** Maximum number of reads after the first read, while the trace is incomplete. */
export const TRACE_MAX_RELOADS = 5;

export interface ServerTraceState {
  events: TraceEvent[];
  isLoading: boolean;
  error: AppError | null;
  refetch: () => void;
}

/**
 * Reads the server events of one trace (`GET /api/v1/traces/{traceId}`).
 * The diagnostics panel uses it to show the full path of a user action.
 */
export function useServerTrace(traceId: string | null | undefined): ServerTraceState {
  const api = useApi();
  const query = useQuery({
    queryKey: ['traces', traceId],
    queryFn: ({ signal }) => api.getTrace(traceId ?? '', { signal }),
    enabled: Boolean(traceId),
    staleTime: 0,
    // The server adds the last event (http.response.sent) after it sends the
    // response, so the first read can come before it. Read the trace again
    // until it is complete, a maximum of TRACE_MAX_RELOADS times.
    refetchInterval: (query) => {
      const { data, dataUpdateCount } = query.state;
      return data && !isTraceComplete(data) && dataUpdateCount <= TRACE_MAX_RELOADS
        ? TRACE_RELOAD_INTERVAL_MS
        : false;
    },
  });
  return {
    events: query.data?.events ?? [],
    isLoading: query.isLoading,
    error: query.error ? toAppError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
