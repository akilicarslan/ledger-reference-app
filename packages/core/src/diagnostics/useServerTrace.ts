import { useQuery } from '@tanstack/react-query';
import type { TraceEvent } from '@ledger/contracts';
import { useApi } from '../api/ApiProvider';
import { toAppError, type AppError } from '../api/errors';

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
    // The server adds the last event (http.response.sent) after it sends the response.
    // A short delay before the first read makes sure that the list is complete.
    retry: 1,
    staleTime: 0,
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
