/**
 * Test IDs. The screens, the unit tests and the Detox tests import them from
 * this file, so a rename cannot break a test without a type error.
 * This file has no imports: Detox (Node.js) can load it.
 */
export const TestIds = {
  tabs: {
    account: 'tab-account',
    markets: 'tab-markets',
  },
  balance: {
    card: 'balance-card',
    amount: 'balance-amount',
    refresh: 'balance-refresh',
    loadError: 'balance-load-error',
  },
  form: {
    container: 'transaction-form',
    typeCredit: 'transaction-type-credit',
    typeDebit: 'transaction-type-debit',
    title: 'transaction-title',
    amount: 'transaction-amount',
    description: 'transaction-description',
    receipt: 'transaction-receipt',
    submit: 'transaction-submit',
    errorBanner: 'transaction-error',
    successBanner: 'transaction-success',
  },
  recent: {
    card: 'recent-transactions',
    list: 'recent-transactions-list',
    empty: 'recent-transactions-empty',
    row: (index: number) => `recent-transaction-${index}`,
  },
  trace: {
    card: 'request-trace',
    id: 'request-trace-id',
    events: 'request-trace-events',
    event: (name: string) => `trace-event-${name}`,
  },
  markets: {
    screen: 'markets-screen',
    status: 'markets-status',
    quoteRow: (symbol: string) => `quote-${symbol}`,
    search: 'stock-search',
  },
  screens: {
    account: 'account-screen',
  },
  errorBoundary: {
    fallback: 'error-fallback',
    retry: 'error-fallback-retry',
  },
} as const;
