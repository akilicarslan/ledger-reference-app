import express, { type Express, type RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import {
  buildOpenApiDocument,
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAYED_HEADER,
  IdempotencyKey,
  NewTransaction,
  REQUEST_ID_HEADER,
  TRACEPARENT_HEADER,
  TraceId,
  type Trace,
  RecentTransactionsQuery,
  StockQuotesQuery,
  StockSearchQuery,
  type Balance,
  type CreateTransactionResult,
  type Health,
  type StockQuoteList,
  type StockSearchResult,
  type TransactionList,
} from '@ledger/contracts';
import type { Ledger } from './domain/ledger';
import type { StockMarket } from './domain/stocks';
import { chaos, type ChaosOptions } from './http/chaos';
import { errorHandler } from './http/errors';
import { traceOf, tracing } from './tracing/requestTrace';
import type { TraceStore } from './tracing/traceStore';

export interface AppDeps {
  ledger: Ledger;
  market: StockMarket;
  traces: TraceStore;
  now: () => Date;
  chaos: ChaosOptions;
  publicUrl: string;
  startedAt: Date;
  log: (message: string) => void;
  logRequests: boolean;
}

/** JSON body limit. It allows one receipt image (see MAX_RECEIPT_IMAGE_LENGTH). */
const JSON_BODY_LIMIT = '2mb';

/**
 * CORS for local development. The web app and Storybook run on other ports.
 * The browser sends a preflight OPTIONS request; the API answers it with 200.
 */
const allowCors: RequestHandler = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    `Content-Type, ${TRACEPARENT_HEADER}, ${IDEMPOTENCY_KEY_HEADER}`,
  );
  // The web client reads the trace ID from the response headers.
  res.setHeader(
    'Access-Control-Expose-Headers',
    `${TRACEPARENT_HEADER}, ${REQUEST_ID_HEADER}, ${IDEMPOTENT_REPLAYED_HEADER}`,
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
};

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(allowCors);
  // Tracing runs before all routes: every response has x-request-id and traceparent.
  app.use(
    tracing({
      store: deps.traces,
      now: deps.now,
      log: deps.logRequests ? deps.log : () => {},
      skipPrefixes: ['/api/v1/traces', '/docs', '/openapi.json', '/api/v1/health'],
    }),
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = express.Router();

  api.get('/health', (_req, res) => {
    const body: Health = {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - deps.startedAt.getTime()) / 1000),
    };
    res.json(body);
  });

  api.get('/balance', (_req, res) => {
    const body: Balance = deps.ledger.getBalance();
    res.json(body);
  });

  api.get('/transactions', (req, res) => {
    const { limit } = RecentTransactionsQuery.parse(req.query);
    const body: TransactionList = { items: deps.ledger.getRecent(limit) };
    res.json(body);
  });

  api.post('/transactions', (req, res) => {
    const trace = traceOf(res);
    const input = NewTransaction.parse(req.body);
    const idempotencyKey = IdempotencyKey.optional().parse(
      req.get(IDEMPOTENCY_KEY_HEADER) || undefined,
    );
    trace.event('validation.passed', {
      type: input.type,
      hasReceiptImage: Boolean(input.receiptImage),
      hasIdempotencyKey: Boolean(idempotencyKey),
    });
    const start = performance.now();
    const { replayed, ...body } = deps.ledger.record(input, {
      traceId: trace.traceId,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    res.setHeader(IDEMPOTENT_REPLAYED_HEADER, String(replayed));
    if (replayed) {
      // A retry of a write that the server already did. Nothing changed.
      trace.event('ledger.transaction.replayed', {
        transactionId: body.transaction.id,
        originalTraceId: body.transaction.traceId,
      });
      res.json(body satisfies CreateTransactionResult);
      return;
    }
    trace.event(
      'ledger.transaction.recorded',
      {
        transactionId: body.transaction.id,
        type: body.transaction.type,
        amount: body.transaction.amount,
        balanceAfter: body.transaction.balanceAfter,
      },
      performance.now() - start,
    );
    res.json(body satisfies CreateTransactionResult);
  });

  api.get('/traces/:traceId', (req, res) => {
    const traceId = TraceId.parse(req.params.traceId);
    const body: Trace = { traceId, events: deps.traces.get(traceId) };
    res.json(body);
  });

  const stockChaos = chaos(deps.chaos);

  api.get('/stocks/quotes', stockChaos, (req, res) => {
    const { symbols } = StockQuotesQuery.parse(req.query);
    const body: StockQuoteList = { quotes: deps.market.getQuotes(symbols) };
    res.json(body);
  });

  api.get('/stocks/search', stockChaos, (req, res) => {
    const { q } = StockSearchQuery.parse(req.query);
    const body: StockSearchResult = { results: deps.market.search(q) };
    res.json(body);
  });

  app.use('/api/v1', api);

  const openApiDocument = buildOpenApiDocument(deps.publicUrl);
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'Ledger API' }),
  );
  app.get('/', (_req, res) => {
    res.redirect('/docs');
  });

  app.use(errorHandler(deps.log));
  return app;
}
