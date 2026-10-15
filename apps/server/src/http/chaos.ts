import type { RequestHandler } from 'express';
import { HttpError } from './errors';
import type { RequestTrace } from '../tracing/requestTrace';

export interface ChaosOptions {
  failureRate: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  random: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const realSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Adds a random delay and a random failure to a route. The stock endpoints
 * use it, so the clients can show retry, debounce and fallback behaviour.
 */
export function chaos(options: ChaosOptions): RequestHandler {
  return async (_req, res, next) => {
    const trace = res.locals.trace as RequestTrace | undefined;
    const span = options.maxLatencyMs - options.minLatencyMs;
    const latency = options.minLatencyMs + Math.round(options.random() * span);
    if (latency > 0) await options.sleep(latency);
    trace?.event('chaos.delay', { latencyMs: latency });
    if (options.random() < options.failureRate) {
      trace?.event('chaos.failure', { failureRate: options.failureRate });
      next(
        new HttpError(
          'UPSTREAM_UNAVAILABLE',
          'The market data service is not available at the moment. Try again.',
        ),
      );
      return;
    }
    next();
  };
}
