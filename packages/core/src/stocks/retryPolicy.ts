import { isRetryable, toAppError } from '../api/errors';

/** Maximum number of retries after the first failed request. */
export const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;

/** React Query `retry` function: retry only temporary failures, a maximum of MAX_RETRIES times. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryable(toAppError(error));
}

/**
 * React Query `retryDelay` function: exponential backoff with "equal jitter".
 * Attempt 0 waits 250-500 ms, attempt 1 waits 500-1000 ms, and so on, to a
 * maximum of 8 s. The jitter prevents many clients from retrying at the same time.
 */
export function retryDelay(attemptIndex: number, random: () => number = Math.random): number {
  const ceiling = Math.min(BASE_DELAY_MS * 2 ** attemptIndex, MAX_DELAY_MS);
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}
