import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CreateTransactionResult, ErrorBody, Trace, parseTraceparent } from '@ledger/contracts';
import { TRACE_A, createTestApp } from './helpers';

const CLIENT_SPAN = '00f067aa0ba902b7';
const traceparent = `00-${TRACE_A}-${CLIENT_SPAN}-01`;

describe('end-to-end tracing', () => {
  it('continues the client trace and sends the trace ID back', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .get('/api/v1/balance')
      .set('traceparent', traceparent)
      .expect(200);
    expect(response.headers['x-request-id']).toBe(TRACE_A);
    const server = parseTraceparent(response.headers.traceparent);
    expect(server?.traceId).toBe(TRACE_A);
    // The server has its own span in the same trace.
    expect(server?.spanId).not.toBe(CLIENT_SPAN);
  });

  it('starts a new trace when the client sends no or a malformed traceparent', async () => {
    const { app } = createTestApp();
    const first = await request(app).get('/api/v1/balance').expect(200);
    const second = await request(app)
      .get('/api/v1/balance')
      .set('traceparent', 'garbage')
      .expect(200);
    expect(first.headers['x-request-id']).toMatch(/^[0-9a-f]{32}$/);
    expect(second.headers['x-request-id']).toMatch(/^[0-9a-f]{32}$/);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  it('stores the trace ID on the recorded transaction and records the server steps', async () => {
    const { app } = createTestApp();
    const created = await request(app)
      .post('/api/v1/transactions')
      .set('traceparent', traceparent)
      .send({ type: 'credit', amount: 25, title: 'Pay' })
      .expect(200);
    expect(CreateTransactionResult.parse(created.body).transaction.traceId).toBe(TRACE_A);

    const trace = Trace.parse(
      (await request(app).get(`/api/v1/traces/${TRACE_A}`).expect(200)).body,
    );
    expect(trace.events.map((event) => event.name)).toEqual([
      'http.request.received',
      'validation.passed',
      'ledger.transaction.recorded',
      'http.response.sent',
    ]);
    expect(trace.events.every((event) => event.parentSpanId === CLIENT_SPAN)).toBe(true);
    expect(trace.events[3]?.attributes.status).toBe(200);
  });

  it('puts the trace ID in the error body and records why the transaction was refused', async () => {
    const { app } = createTestApp();
    const refused = await request(app)
      .post('/api/v1/transactions')
      .set('traceparent', traceparent)
      .send({ type: 'debit', amount: 10, title: 'Laptop' })
      .expect(500);
    expect(ErrorBody.parse(refused.body).error).toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      traceId: TRACE_A,
    });

    const trace = Trace.parse((await request(app).get(`/api/v1/traces/${TRACE_A}`)).body);
    const refusal = trace.events.find((event) => event.name === 'ledger.transaction.refused');
    expect(refusal?.attributes).toMatchObject({ availableCents: 0, requestedCents: 1000 });
    expect(trace.events.at(-1)?.attributes.status).toBe(500);
  });

  it('records the chaos delay and failure of a stock request', async () => {
    const { app } = createTestApp({
      failureRate: 1,
      minLatencyMs: 50,
      maxLatencyMs: 50,
      random: () => 0,
    });
    await request(app)
      .get('/api/v1/stocks/quotes?symbols=AAPL')
      .set('traceparent', traceparent)
      .expect(500);
    const trace = Trace.parse((await request(app).get(`/api/v1/traces/${TRACE_A}`)).body);
    expect(trace.events.map((event) => event.name)).toContain('chaos.failure');
    expect(trace.events.find((event) => event.name === 'chaos.delay')?.attributes.latencyMs).toBe(
      50,
    );
  });

  it('sends an empty event list for an unknown trace and refuses a malformed trace ID', async () => {
    const { app } = createTestApp();
    const unknown = await request(app)
      .get(`/api/v1/traces/${'a'.repeat(32)}`)
      .expect(200);
    expect(unknown.body).toEqual({ traceId: 'a'.repeat(32), events: [] });
    const malformed = await request(app).get('/api/v1/traces/not-a-trace').expect(500);
    expect(ErrorBody.parse(malformed.body).error.code).toBe('VALIDATION_FAILED');
  });

  it('lets the browser send traceparent and read x-request-id (CORS)', async () => {
    const { app } = createTestApp();
    const preflight = await request(app).options('/api/v1/transactions').expect(200);
    expect(preflight.headers['access-control-allow-headers']).toContain('traceparent');
    expect(preflight.headers['access-control-expose-headers']).toContain('x-request-id');
  });
});
