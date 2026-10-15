import { z } from 'zod';
import { MAX_TRANSACTION_AMOUNT } from './money';
import { IdempotencyKey } from './idempotency';
import { TraceId } from './trace';

/**
 * API schemas. Each schema with an `id` becomes one entry in
 * `components.schemas` of the OpenAPI document (see ./openapi.ts).
 * The server and the clients use these same schemas for runtime validation.
 */

export const IsoDateTime = z.iso.datetime({ offset: true }).meta({
  id: 'IsoDateTime',
  description: 'Date and time in ISO 8601 format.',
  example: '2026-10-13T09:30:00.000Z',
});

export const Currency = z
  .literal('USD')
  .meta({ id: 'Currency', description: 'ISO 4217 currency code. The account uses one currency.' });

export const TransactionType = z.enum(['debit', 'credit']).meta({
  id: 'TransactionType',
  description: '`credit` adds money to the account. `debit` removes money from the account.',
});

export const Amount = z.number().positive().max(MAX_TRANSACTION_AMOUNT).multipleOf(0.01).meta({
  id: 'Amount',
  description:
    'Unsigned floating-point amount with a maximum of 2 decimal places. The value must be more than 0.',
  example: 42.5,
});

/** A JPEG, PNG or WebP image as a base64 data URI. Maximum length: 1.5 MB of text. */
export const MAX_RECEIPT_IMAGE_LENGTH = 1_500_000;
export const ReceiptImage = z
  .string()
  .max(MAX_RECEIPT_IMAGE_LENGTH)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/, {
    message: 'The image must be a PNG, JPEG or WebP base64 data URI.',
  })
  .meta({
    id: 'ReceiptImage',
    description: 'Optional receipt image as a base64 data URI (PNG, JPEG or WebP).',
  });

export const TITLE_MAX_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 500;

export const NewTransaction = z
  .object({
    type: TransactionType,
    amount: Amount,
    title: z.string().trim().min(1).max(TITLE_MAX_LENGTH).meta({ example: 'Office supplies' }),
    description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).default('').meta({
      example: 'Printer paper and toner',
    }),
    dateTime: IsoDateTime.optional().meta({
      description:
        'Time of the transaction. If you do not send it, the server uses the current time.',
    }),
    receiptImage: ReceiptImage.optional(),
  })
  .meta({ id: 'NewTransaction', description: 'The data to record one transaction.' });

export const Transaction = z
  .object({
    id: z.uuid(),
    type: TransactionType,
    amount: Amount,
    title: z.string(),
    description: z.string(),
    dateTime: IsoDateTime,
    receiptImage: ReceiptImage.nullable(),
    balanceAfter: z
      .number()
      .min(0)
      .meta({ description: 'Account balance after this transaction.' }),
    traceId: TraceId.meta({
      description:
        'Trace ID of the request that recorded the transaction (the "Reference ID" in the UI).',
    }),
    idempotencyKey: IdempotencyKey.optional().meta({
      description: 'The `idempotency-key` header of the request that recorded the transaction.',
    }),
  })
  .meta({ id: 'Transaction', description: 'One recorded transaction.' });

export const Balance = z
  .object({
    amount: z
      .number()
      .min(0)
      .meta({ description: 'Current balance. It is never less than 0.', example: 1250.75 }),
    currency: Currency,
    updatedAt: IsoDateTime,
  })
  .meta({ id: 'Balance', description: 'The current account balance.' });

export const RECENT_TRANSACTIONS_DEFAULT_LIMIT = 5;
export const RECENT_TRANSACTIONS_MAX_LIMIT = 50;

export const RecentTransactionsQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(RECENT_TRANSACTIONS_MAX_LIMIT)
    .default(RECENT_TRANSACTIONS_DEFAULT_LIMIT),
});

export const TransactionList = z
  .object({
    items: z.array(Transaction).meta({ description: 'Newest transaction first.' }),
  })
  .meta({ id: 'TransactionList', description: 'The most recent transactions.' });

export const CreateTransactionResult = z
  .object({
    transaction: Transaction,
    balance: Balance,
  })
  .meta({
    id: 'CreateTransactionResult',
    description: 'The recorded transaction and the new balance.',
  });

/** Error codes that the server sends. */
export const ErrorCode = z
  .enum([
    'INSUFFICIENT_FUNDS',
    'VALIDATION_FAILED',
    'IDEMPOTENCY_KEY_REUSED',
    'UPSTREAM_UNAVAILABLE',
    'INTERNAL_ERROR',
  ])
  .meta({
    id: 'ErrorCode',
    description:
      'Machine-readable error code. The API sends HTTP 500 for all errors (assignment rule), so clients must use this code, not the HTTP status.',
  });

export const ErrorBody = z
  .object({
    error: z.object({
      code: ErrorCode,
      message: z.string().meta({ description: 'Message that the UI can show to the user.' }),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .meta({ description: 'Field errors. Only for VALIDATION_FAILED.' }),
      traceId: TraceId.optional().meta({
        description: 'Trace ID of the failed request. Give it to support to find the server logs.',
      }),
    }),
  })
  .meta({ id: 'ErrorBody', description: 'Error response.' });

export const StockSymbol = z
  .string()
  .regex(/^[A-Z.]{1,10}$/)
  .meta({ id: 'StockSymbol', example: 'AAPL' });

export const StockQuote = z
  .object({
    symbol: StockSymbol,
    name: z.string(),
    price: z.number().nonnegative(),
    change: z.number(),
    changePercent: z.number(),
    currency: Currency,
    asOf: IsoDateTime,
  })
  .meta({ id: 'StockQuote', description: 'Mock market price for one stock.' });

export const StockQuotesQuery = z.object({
  symbols: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    )
    .pipe(z.array(StockSymbol).min(1).max(20)),
});

export const StockQuoteList = z.object({ quotes: z.array(StockQuote) }).meta({
  id: 'StockQuoteList',
  description: 'Quotes for the requested symbols. Unknown symbols are not included.',
});

export const StockSearchQuery = z.object({
  q: z.string().trim().min(1).max(20),
});

export const StockSearchResult = z
  .object({
    results: z.array(z.object({ symbol: StockSymbol, name: z.string() })),
  })
  .meta({ id: 'StockSearchResult', description: 'Stocks that match the search text.' });

export const Health = z
  .object({ status: z.literal('ok'), uptimeSeconds: z.number().nonnegative() })
  .meta({ id: 'Health' });

export type IsoDateTime = z.infer<typeof IsoDateTime>;
export type TransactionType = z.infer<typeof TransactionType>;
/** Request body as the client sends it (`description` is optional). */
export type NewTransactionInput = z.input<typeof NewTransaction>;
/** Request body after validation (`description` has a default). */
export type NewTransaction = z.output<typeof NewTransaction>;
export type Transaction = z.infer<typeof Transaction>;
export type Balance = z.infer<typeof Balance>;
export type TransactionList = z.infer<typeof TransactionList>;
export type CreateTransactionResult = z.infer<typeof CreateTransactionResult>;
export type ErrorCode = z.infer<typeof ErrorCode>;
export type ErrorBody = z.infer<typeof ErrorBody>;
export type StockQuote = z.infer<typeof StockQuote>;
export type StockQuoteList = z.infer<typeof StockQuoteList>;
export type StockSearchResult = z.infer<typeof StockSearchResult>;
export type Health = z.infer<typeof Health>;
