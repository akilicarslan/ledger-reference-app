import { z } from 'zod';
import {
  RECENT_TRANSACTIONS_DEFAULT_LIMIT,
  RECENT_TRANSACTIONS_MAX_LIMIT,
  NewTransaction,
} from './schemas';

/**
 * Builds the OpenAPI 3.1 document from the Zod schemas.
 *
 * The Zod schemas are the single source of truth. Zod converts them to
 * JSON Schema 2020-12, which is the schema dialect of OpenAPI 3.1.
 * Do not edit apps/server/openapi.json by hand. Run `pnpm openapi:generate`.
 */

type JsonObject = Record<string, unknown>;

const API_PREFIX = '/api/v1';
const ref = (id: string) => ({ $ref: `#/components/schemas/${id}` });

function stripDialectKeys(schemas: Record<string, JsonObject>): Record<string, JsonObject> {
  return Object.fromEntries(
    Object.entries(schemas).map(([id, schema]) => {
      const { $schema: _dialect, $id: _id, ...rest } = schema;
      return [id, rest];
    }),
  );
}

function buildComponentSchemas(): Record<string, JsonObject> {
  const options = { uri: (id: string) => `#/components/schemas/${id}` } as const;
  const output = z.toJSONSchema(z.globalRegistry, { ...options, io: 'output' }).schemas;
  // Request bodies use the "input" view: fields with a default value are optional for the client.
  const input = z.toJSONSchema(z.globalRegistry, { ...options, io: 'input' }).schemas;
  const requestIds = [String(z.globalRegistry.get(NewTransaction)?.id)];
  const merged: Record<string, JsonObject> = { ...(output as Record<string, JsonObject>) };
  for (const id of requestIds) {
    const schema = input[id];
    if (schema) merged[id] = schema as JsonObject;
  }
  return stripDialectKeys(merged);
}

const errorResponse = { $ref: '#/components/responses/Error' };

const TRACE_RESPONSE_HEADERS = {
  traceparent: { $ref: '#/components/headers/Traceparent' },
  'x-request-id': { $ref: '#/components/headers/RequestId' },
};

/**
 * Adds the tracing contract to every operation: the optional `traceparent`
 * request header and the `traceparent` / `x-request-id` response headers.
 * A new endpoint gets them automatically.
 */
function withTracing(paths: Record<string, Record<string, JsonObject>>): JsonObject {
  for (const operations of Object.values(paths)) {
    for (const operation of Object.values(operations)) {
      const parameters = (operation.parameters as JsonObject[] | undefined) ?? [];
      operation.parameters = [{ $ref: '#/components/parameters/Traceparent' }, ...parameters];
      const responses = operation.responses as Record<string, JsonObject>;
      const ok = responses['200'];
      if (ok) ok.headers = { ...TRACE_RESPONSE_HEADERS, ...(ok.headers as JsonObject | undefined) };
    }
  }
  return paths;
}

function jsonResponse(description: string, schemaId: string) {
  return {
    description,
    content: { 'application/json': { schema: ref(schemaId) } },
  };
}

export const OPENAPI_INFO = {
  title: 'Ledger mock API',
  version: '1.0.0',
  description: [
    'HTTP API for the Ledger local account app.',
    '',
    'Rules:',
    '- The API sends 200 OK for a successful request.',
    '- The API sends 500 Internal Server Error for all errors. Use `error.code` to identify the error.',
    '- A transaction that makes the balance less than 0 is refused with the code `INSUFFICIENT_FUNDS`.',
    '- Send `idempotency-key: <UUID v4>` with `POST /transactions`. A retry with the same key does not record the transaction two times.',
    '- The stock endpoints add a random delay and fail at random. Use them to test retry and fallback logic.',
    '',
    'Tracing (W3C Trace Context):',
    '- Send `traceparent: 00-<traceId>-<spanId>-01` to join a trace. If you do not send it, the server starts a new trace.',
    '- Each response has `x-request-id` (the trace ID) and `traceparent` (the server span).',
    '- Error bodies and recorded transactions have `traceId`. `GET /api/v1/traces/{traceId}` sends the server events of a trace.',
  ].join('\n'),
} as const;

export function buildOpenApiDocument(serverUrl = 'http://localhost:4000'): JsonObject {
  return {
    openapi: '3.1.0',
    info: OPENAPI_INFO,
    servers: [{ url: serverUrl, description: 'Local mock server' }],
    tags: [
      { name: 'Account', description: 'Balance and transactions.' },
      { name: 'Stocks', description: 'Mock market data with random delay and random failure.' },
      { name: 'System', description: 'Service status.' },
      { name: 'Diagnostics', description: 'End-to-end request traces.' },
    ],
    paths: withTracing({
      [`${API_PREFIX}/health`]: {
        get: {
          tags: ['System'],
          operationId: 'getHealth',
          summary: 'Get the service status',
          responses: {
            '200': jsonResponse('The service is available.', 'Health'),
            '500': errorResponse,
          },
        },
      },
      [`${API_PREFIX}/balance`]: {
        get: {
          tags: ['Account'],
          operationId: 'getBalance',
          summary: 'Read the current account balance',
          responses: {
            '200': jsonResponse('The current balance.', 'Balance'),
            '500': errorResponse,
          },
        },
      },
      [`${API_PREFIX}/transactions`]: {
        get: {
          tags: ['Account'],
          operationId: 'listRecentTransactions',
          summary: 'Read the last transactions (default: last 5)',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Number of transactions to send.',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: RECENT_TRANSACTIONS_MAX_LIMIT,
                default: RECENT_TRANSACTIONS_DEFAULT_LIMIT,
              },
            },
          ],
          responses: {
            '200': jsonResponse(
              'The transactions. The newest transaction is first.',
              'TransactionList',
            ),
            '500': errorResponse,
          },
        },
        post: {
          tags: ['Account'],
          operationId: 'createTransaction',
          summary: 'Write one transaction',
          description:
            'Records one debit or credit. If the debit makes the balance less than 0, the server refuses the transaction and sends `INSUFFICIENT_FUNDS`. Send an `idempotency-key` header to make a retry safe: the server records each key only one time.',
          parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ref('NewTransaction') } },
          },
          responses: {
            '200': {
              ...jsonResponse(
                'The transaction is recorded, or it was recorded before with the same idempotency key.',
                'CreateTransactionResult',
              ),
              headers: {
                'idempotent-replayed': { $ref: '#/components/headers/IdempotentReplayed' },
              },
            },
            '500': errorResponse,
          },
        },
      },
      [`${API_PREFIX}/stocks/quotes`]: {
        get: {
          tags: ['Stocks'],
          operationId: 'getStockQuotes',
          summary: 'Read mock quotes for one or more symbols',
          parameters: [
            {
              name: 'symbols',
              in: 'query',
              required: true,
              description: 'Comma-separated list of symbols. Maximum: 20.',
              schema: { type: 'string', example: 'AAPL,MSFT' },
            },
          ],
          responses: { '200': jsonResponse('The quotes.', 'StockQuoteList'), '500': errorResponse },
        },
      },
      [`${API_PREFIX}/stocks/search`]: {
        get: {
          tags: ['Stocks'],
          operationId: 'searchStocks',
          summary: 'Find stocks by symbol or name',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              description: 'Search text. Length: 1 to 20 characters.',
              schema: { type: 'string', minLength: 1, maxLength: 20 },
            },
          ],
          responses: {
            '200': jsonResponse('Matching stocks.', 'StockSearchResult'),
            '500': errorResponse,
          },
        },
      },
      [`${API_PREFIX}/traces/{traceId}`]: {
        get: {
          tags: ['Diagnostics'],
          operationId: 'getTrace',
          summary: 'Read the server events of one user action',
          description:
            'Use the Reference ID that the app shows. A trace with no events sends an empty list (200).',
          parameters: [
            {
              name: 'traceId',
              in: 'path',
              required: true,
              schema: ref('TraceId'),
            },
          ],
          responses: {
            '200': jsonResponse('The events of the trace.', 'Trace'),
            '500': errorResponse,
          },
        },
      },
    }),
    components: {
      schemas: buildComponentSchemas(),
      parameters: {
        Traceparent: {
          name: 'traceparent',
          in: 'header',
          required: false,
          description:
            'W3C Trace Context header of the client span. The server continues this trace.',
          schema: { type: 'string', pattern: '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$' },
          example: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
        IdempotencyKey: {
          name: 'idempotency-key',
          in: 'header',
          required: false,
          description:
            'One key for one write. A retry with the same key and the same body does not record a second transaction. The same key with a different body gives `IDEMPOTENCY_KEY_REUSED`.',
          schema: ref('IdempotencyKey'),
        },
      },
      headers: {
        Traceparent: {
          description: 'W3C Trace Context header of the server span.',
          schema: { type: 'string' },
        },
        RequestId: {
          description: 'The trace ID of the request (32 hex characters).',
          schema: { $ref: '#/components/schemas/TraceId' },
        },
        IdempotentReplayed: {
          description:
            '`true` when the server did not record a new transaction, because it already had one with this idempotency key.',
          schema: { type: 'string', enum: ['true', 'false'] },
        },
      },
      responses: {
        Error: {
          description: 'The request failed. Read `error.code` and `error.message`.',
          headers: TRACE_RESPONSE_HEADERS,
          content: { 'application/json': { schema: ref('ErrorBody') } },
        },
      },
    },
  };
}
