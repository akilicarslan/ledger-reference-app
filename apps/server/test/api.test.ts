import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  buildOpenApiDocument,
  Balance,
  CreateTransactionResult,
  ErrorBody,
  StockQuoteList,
  StockSearchResult,
  TransactionList,
} from '@ledger/contracts';
import { createTestApp } from './helpers';

describe('account API', () => {
  it('GET /api/v1/balance sends 200 and a valid Balance', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/v1/balance').expect(200);
    expect(Balance.parse(response.body).amount).toBe(0);
  });

  it('POST /api/v1/transactions records a credit and sends the new balance', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/v1/transactions')
      .send({ type: 'credit', amount: 120.5, title: 'Salary', description: 'October' })
      .expect(200);
    const body = CreateTransactionResult.parse(response.body);
    expect(body.balance.amount).toBe(120.5);
    expect(body.transaction).toMatchObject({
      type: 'credit',
      amount: 120.5,
      title: 'Salary',
      receiptImage: null,
    });
  });

  it('refuses a transaction that makes the balance negative, with 500 and INSUFFICIENT_FUNDS', async () => {
    const { app } = createTestApp();
    await request(app)
      .post('/api/v1/transactions')
      .send({ type: 'credit', amount: 20, title: 'Cash' })
      .expect(200);
    const response = await request(app)
      .post('/api/v1/transactions')
      .send({ type: 'debit', amount: 20.01, title: 'Laptop' })
      .expect(500);
    const body = ErrorBody.parse(response.body);
    expect(body.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(body.error.message).toContain('$20.00');

    const balance = await request(app).get('/api/v1/balance').expect(200);
    expect(balance.body.amount).toBe(20);
  });

  it('sends 500 and VALIDATION_FAILED with field details for a bad body', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/v1/transactions')
      .send({ type: 'debit', amount: -5, title: '' })
      .expect(500);
    const body = ErrorBody.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.details?.map((detail) => detail.path)).toEqual(['amount', 'title']);
  });

  it('sends 500 and VALIDATION_FAILED for a body that is not JSON', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/v1/transactions')
      .set('Content-Type', 'application/json')
      .send('{"type":')
      .expect(500);
    expect(ErrorBody.parse(response.body).error.code).toBe('VALIDATION_FAILED');
  });

  it('GET /api/v1/transactions sends the last 5 transactions, newest first', async () => {
    const { app } = createTestApp();
    for (let index = 1; index <= 6; index += 1) {
      await request(app)
        .post('/api/v1/transactions')
        .send({ type: 'credit', amount: index, title: `Deposit ${index}` })
        .expect(200);
    }
    const response = await request(app).get('/api/v1/transactions').expect(200);
    const body = TransactionList.parse(response.body);
    expect(body.items.map((item) => item.title)).toEqual([
      'Deposit 6',
      'Deposit 5',
      'Deposit 4',
      'Deposit 3',
      'Deposit 2',
    ]);
  });

  it('answers a CORS preflight request with 200', async () => {
    const { app } = createTestApp();
    const response = await request(app).options('/api/v1/transactions').expect(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('stocks API (chaos)', () => {
  it('sends quotes for known symbols only', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .get('/api/v1/stocks/quotes?symbols=AAPL,NOPE,msft')
      .expect(200);
    expect(StockQuoteList.parse(response.body).quotes.map((quote) => quote.symbol)).toEqual([
      'AAPL',
      'MSFT',
    ]);
  });

  it('fails with 500 and UPSTREAM_UNAVAILABLE when the random value is below the failure rate', async () => {
    const { app } = createTestApp({ failureRate: 0.5, random: () => 0.1 });
    const response = await request(app).get('/api/v1/stocks/quotes?symbols=AAPL').expect(500);
    expect(ErrorBody.parse(response.body).error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('waits for the random latency before it answers', async () => {
    const delays: number[] = [];
    const { app } = createTestApp({
      minLatencyMs: 100,
      maxLatencyMs: 300,
      random: () => 0.5,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    await request(app).get('/api/v1/stocks/search?q=app').expect(200);
    expect(delays).toEqual([200]);
  });

  it('finds stocks by symbol prefix or by name', async () => {
    const { app } = createTestApp();
    const bySymbol = await request(app).get('/api/v1/stocks/search?q=ms').expect(200);
    expect(StockSearchResult.parse(bySymbol.body).results[0]?.symbol).toBe('MSFT');
    const byName = await request(app).get('/api/v1/stocks/search?q=pfizer').expect(200);
    expect(StockSearchResult.parse(byName.body).results).toEqual([
      { symbol: 'PFE', name: 'Pfizer Inc.' },
    ]);
  });
});

describe('documentation', () => {
  it('serves the OpenAPI document and Swagger UI', async () => {
    const { app } = createTestApp();
    const spec = await request(app).get('/openapi.json').expect(200);
    expect(spec.body.openapi).toBe('3.1.0');
    await request(app).get('/docs/').expect(200);
  });
});

describe('OpenAPI paths and routes agree', () => {
  it('serves every documented operation (no 404)', async () => {
    const { app } = createTestApp();
    const document = buildOpenApiDocument() as { paths: Record<string, Record<string, unknown>> };
    const samples: Record<string, string> = {
      '/api/v1/transactions': '?limit=5',
      '/api/v1/stocks/quotes': '?symbols=AAPL',
      '/api/v1/stocks/search': '?q=a',
    };
    for (const [path, operations] of Object.entries(document.paths)) {
      for (const method of Object.keys(operations)) {
        const url = `${path}${method === 'get' ? (samples[path] ?? '') : ''}`;
        const response =
          method === 'post'
            ? await request(app).post(url).send({ type: 'credit', amount: 1, title: 'Route check' })
            : await request(app).get(url);
        expect([200, 500], `${method.toUpperCase()} ${path}`).toContain(response.status);
      }
    }
  });
});
