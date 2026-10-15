import type { RequestHandler, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  TRACEPARENT_HEADER,
  formatTraceparent,
  newSpanId,
  newTraceId,
  parseTraceparent,
} from '@ledger/contracts';
import type { TraceStore } from './traceStore';

type Attributes = Record<string, string | number | boolean>;

/**
 * The trace of one HTTP request. Code that handles the request calls
 * `event(...)` for each important step. Each event goes to the trace store
 * and to the log as one JSON line with the trace ID.
 */
export class RequestTrace {
  private readonly startedAt = performance.now();

  constructor(
    readonly traceId: string,
    readonly spanId: string,
    readonly parentSpanId: string | undefined,
    private readonly store: TraceStore,
    private readonly now: () => Date,
    private readonly log: (line: string) => void,
  ) {}

  /** Milliseconds since the server received the request. */
  elapsedMs(): number {
    return Math.round((performance.now() - this.startedAt) * 10) / 10;
  }

  event(name: string, attributes: Attributes = {}, durationMs?: number): void {
    const at = this.now().toISOString();
    this.store.record({
      traceId: this.traceId,
      spanId: this.spanId,
      ...(this.parentSpanId ? { parentSpanId: this.parentSpanId } : {}),
      name,
      at,
      ...(durationMs === undefined ? {} : { durationMs: Math.round(durationMs * 10) / 10 }),
      attributes: { ...attributes, elapsedMs: this.elapsedMs() },
    });
    this.log(
      JSON.stringify({
        time: at,
        traceId: this.traceId,
        spanId: this.spanId,
        event: name,
        ...attributes,
        ...(durationMs === undefined ? {} : { durationMs }),
      }),
    );
  }
}

export interface TracingOptions {
  store: TraceStore;
  now: () => Date;
  log: (line: string) => void;
  /** Requests for these path prefixes are not traced (for example the trace viewer itself). */
  skipPrefixes?: string[];
}

/**
 * Express middleware. It continues the client trace from the `traceparent`
 * header (or starts a new trace) and sends the trace ID back in
 * `x-request-id` and `traceparent`.
 */
export function tracing({ store, now, log, skipPrefixes = [] }: TracingOptions): RequestHandler {
  return (req, res, next) => {
    const incoming = parseTraceparent(req.header(TRACEPARENT_HEADER));
    const trace = new RequestTrace(
      incoming?.traceId ?? newTraceId(),
      newSpanId(),
      incoming?.spanId,
      store,
      now,
      log,
    );
    res.locals.trace = trace;
    res.setHeader(REQUEST_ID_HEADER, trace.traceId);
    res.setHeader(
      TRACEPARENT_HEADER,
      formatTraceparent({ traceId: trace.traceId, spanId: trace.spanId }),
    );

    if (skipPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      next();
      return;
    }

    trace.event('http.request.received', {
      method: req.method,
      path: req.path,
      continuedClientTrace: Boolean(incoming),
    });
    res.on('finish', () => {
      trace.event('http.response.sent', { status: res.statusCode }, trace.elapsedMs());
    });
    next();
  };
}

/** The trace of the current request. The tracing middleware always sets it. */
export function traceOf(res: Response): RequestTrace {
  const trace = res.locals.trace as RequestTrace | undefined;
  if (!trace) throw new Error('The tracing middleware did not run.');
  return trace;
}
