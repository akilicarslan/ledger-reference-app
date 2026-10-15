import { describe, expect, it, vi } from 'vitest';
import { parseTraceparent } from '@ledger/contracts';
import { createApiClient } from '../src/api/client';
import { ApiError } from '../src/api/errors';
import { balance } from './fakes';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createApiClient', () => {
  it('calls the versioned URL and validates the response with Zod', async () => {
    const fetchFn = vi.fn(async () => json(200, balance(12.5)));
    const api = createApiClient({ baseUrl: 'http://api.test/', fetchFn });
    await expect(api.getBalance()).resolves.toEqual(balance(12.5));
    expect(fetchFn).toHaveBeenCalledWith('http://api.test/api/v1/balance', expect.any(Object));
  });

  it('sends the transaction as JSON', async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) =>
      json(500, { error: { code: 'INSUFFICIENT_FUNDS', message: 'Refused.' } }),
    );
    const api = createApiClient({ baseUrl: 'http://api.test', fetchFn: fetchFn as typeof fetch });
    const promise = api.createTransaction({ type: 'debit', amount: 5, title: 'Lunch' });
    await expect(promise).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      message: 'Refused.',
    });
    const init = fetchFn.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ type: 'debit', amount: 5, title: 'Lunch' });
  });

  it('sends the idempotency-key header only when the caller gives a key', async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) =>
      json(200, { amount: 1, currency: 'USD', updatedAt: '2026-10-13T09:00:00.000Z' }),
    );
    const api = createApiClient({ baseUrl: 'http://api.test', fetchFn: fetchFn as typeof fetch });
    const key = '6f1c2a3e-8b4d-4f0a-9c1e-2d3b4a5c6d7e';
    await api
      .createTransaction({ type: 'credit', amount: 1, title: 'a' }, { idempotencyKey: key })
      .catch(() => undefined);
    await api.getBalance();
    const headersOf = (index: number) =>
      fetchFn.mock.calls[index]?.[1]?.headers as Record<string, string>;
    expect(headersOf(0)['idempotency-key']).toBe(key);
    expect(headersOf(1)['idempotency-key']).toBeUndefined();
  });

  it('uses INVALID_RESPONSE when the body does not match the schema', async () => {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchFn: async () => json(200, { amount: 'ten' }),
    });
    await expect(api.getBalance()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('uses INTERNAL_ERROR when an error body has an unknown shape', async () => {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchFn: async () => new Response('oops', { status: 500 }),
    });
    await expect(api.getBalance()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('uses NETWORK_ERROR when fetch fails', async () => {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchFn: async () => {
        throw new TypeError('Network request failed');
      },
    });
    await expect(api.getBalance()).rejects.toBeInstanceOf(ApiError);
    await expect(api.getBalance()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('uses TIMEOUT when the server does not answer in time', async () => {
    const neverAnswers = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchFn: neverAnswers,
      timeoutMs: 10,
    });
    await expect(api.getBalance()).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('passes a caller cancellation through without a new error code', async () => {
    const controller = new AbortController();
    const neverAnswers = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    const api = createApiClient({ baseUrl: 'http://api.test', fetchFn: neverAnswers });
    const promise = api.searchStocks('ap', { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('sends a traceparent header with the action trace ID and a new span for each request', async () => {
    const headers: string[] = [];
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      headers.push(String((init?.headers as Record<string, string>).traceparent));
      return json(200, balance(1));
    });
    const api = createApiClient({ baseUrl: 'http://api.test', fetchFn: fetchFn as typeof fetch });
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    await api.getBalance({ traceId });
    await api.getBalance({ traceId });
    const parsed = headers.map((header) => parseTraceparent(header));
    expect(parsed.map((context) => context?.traceId)).toEqual([traceId, traceId]);
    expect(parsed[0]?.spanId).not.toBe(parsed[1]?.spanId);
  });

  it('keeps the trace ID of a failed request in the error', async () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchFn: async () =>
        json(500, { error: { code: 'INSUFFICIENT_FUNDS', message: 'Refused.', traceId } }),
    });
    await expect(
      api.createTransaction({ type: 'debit', amount: 1, title: 'x' }),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      traceId,
    });
    const offline = createApiClient({
      baseUrl: 'http://api.test',
      fetchFn: async () => {
        throw new TypeError('Network request failed');
      },
    });
    // Without a server answer, the error still has the client trace ID.
    await expect(offline.getBalance({ traceId })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      traceId,
    });
  });
});
