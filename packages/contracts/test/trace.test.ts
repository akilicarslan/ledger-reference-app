import { describe, expect, it } from 'vitest';
import {
  buildOpenApiDocument,
  formatTraceparent,
  newSpanId,
  newTraceContext,
  newTraceId,
  parseTraceparent,
  randomHex,
} from '../src';

describe('trace helpers (W3C Trace Context)', () => {
  it('creates IDs with the correct length and alphabet', () => {
    expect(newTraceId()).toMatch(/^[0-9a-f]{32}$/);
    expect(newSpanId()).toMatch(/^[0-9a-f]{16}$/);
    expect(newTraceId()).not.toBe(newTraceId());
  });

  it('keeps the trace ID and creates a new span ID for each request of one action', () => {
    const traceId = newTraceId();
    const first = newTraceContext(traceId);
    const second = newTraceContext(traceId);
    expect(first.traceId).toBe(second.traceId);
    expect(first.spanId).not.toBe(second.spanId);
  });

  it('formats and parses the traceparent header', () => {
    const context = { traceId: '4bf92f3577b34da6a3ce929d0e0e4736', spanId: '00f067aa0ba902b7' };
    const header = formatTraceparent(context);
    expect(header).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    expect(parseTraceparent(header)).toEqual(context);
    expect(parseTraceparent(header.toUpperCase())).toEqual(context);
  });

  it.each([
    undefined,
    '',
    'garbage',
    '01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    '00-00000000000000000000000000000000-00f067aa0ba902b7-01',
    '00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01',
  ])('refuses %s', (value) => {
    expect(parseTraceparent(value)).toBeNull();
  });

  it('never creates an all-zero ID, also without crypto', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    const random = Math.random;
    Math.random = () => 0;
    try {
      expect(randomHex(4)).toBe('00000001');
    } finally {
      Math.random = random;
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});

describe('OpenAPI tracing contract', () => {
  type Operation = {
    parameters?: { $ref?: string }[];
    responses: Record<string, { headers?: object }>;
  };
  const document = buildOpenApiDocument() as unknown as {
    paths: Record<string, Record<string, Operation>>;
  };

  it('documents the traceparent header and the trace response headers on every operation', () => {
    for (const [path, operations] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const name = `${method.toUpperCase()} ${path}`;
        expect(operation.parameters?.[0]?.$ref, name).toBe('#/components/parameters/Traceparent');
        expect(operation.responses['200']?.headers, name).toHaveProperty('x-request-id');
      }
    }
  });

  it('documents the trace endpoint', () => {
    expect(document.paths['/api/v1/traces/{traceId}']?.get).toBeDefined();
  });
});
