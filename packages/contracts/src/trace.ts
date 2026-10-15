import { z } from 'zod';

/**
 * End-to-end request tracing (W3C Trace Context, https://www.w3.org/TR/trace-context/).
 *
 * - The client creates one trace ID for each user action (for example "Record debit").
 * - Each HTTP request of that action sends `traceparent: 00-<traceId>-<spanId>-01`.
 * - The server continues the trace, logs each step with the trace ID, stores
 *   the trace ID on the transaction, and sends it back in `x-request-id`.
 * - The UI shows the trace ID as the "Reference ID". Support can find all
 *   logs of one user action with it.
 */

export const TRACEPARENT_HEADER = 'traceparent';
export const REQUEST_ID_HEADER = 'x-request-id';

export const TraceId = z
  .string()
  .regex(/^[0-9a-f]{32}$/)
  .meta({
    id: 'TraceId',
    description: 'W3C trace ID: 32 lowercase hex characters. One ID for one user action.',
    example: '4bf92f3577b34da6a3ce929d0e0e4736',
  });

export const SpanId = z
  .string()
  .regex(/^[0-9a-f]{16}$/)
  .meta({ id: 'SpanId', description: 'W3C span ID: 16 lowercase hex characters.' });

export interface TraceContext {
  traceId: string;
  spanId: string;
}

/**
 * Random hex string. Uses `crypto.getRandomValues` when the runtime has it
 * (browsers, Node.js); else Math.random. Trace IDs are not secrets.
 */
export function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  const crypto = (
    globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }
  ).crypto;
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < byteCount; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  }
  let hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  // The specification does not allow an ID with only zeros.
  if (/^0+$/.test(hex)) hex = `${hex.slice(0, -1)}1`;
  return hex;
}

export const newTraceId = (): string => randomHex(16);
export const newSpanId = (): string => randomHex(8);

export function newTraceContext(traceId: string = newTraceId()): TraceContext {
  return { traceId, spanId: newSpanId() };
}

/** `{ traceId, spanId }` → `00-<traceId>-<spanId>-01` (version 00, sampled). */
export function formatTraceparent({ traceId, spanId }: TraceContext): string {
  return `00-${traceId}-${spanId}-01`;
}

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Returns null for a missing or malformed header, or for an all-zero ID. */
export function parseTraceparent(value: string | null | undefined): TraceContext | null {
  const match = value ? TRACEPARENT_PATTERN.exec(value.trim().toLowerCase()) : null;
  if (!match) return null;
  const [, traceId = '', spanId = ''] = match;
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) return null;
  return { traceId, spanId };
}

export const TraceEvent = z
  .object({
    traceId: TraceId,
    spanId: SpanId,
    parentSpanId: SpanId.optional().meta({
      description: 'The span of the caller (the client request).',
    }),
    name: z.string().meta({ example: 'ledger.transaction.refused' }),
    at: z.iso.datetime({ offset: true }),
    durationMs: z.number().nonnegative().optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  })
  .meta({ id: 'TraceEvent', description: 'One step that the server did for a request.' });

export const Trace = z
  .object({
    traceId: TraceId,
    events: z
      .array(TraceEvent)
      .meta({ description: 'Oldest event first. Empty if the server has no events.' }),
  })
  .meta({ id: 'Trace', description: 'All server events of one user action.' });

export type TraceEvent = z.infer<typeof TraceEvent>;
export type Trace = z.infer<typeof Trace>;
