import type { TraceEventName } from '@ledger/contracts';

/**
 * Test IDs. The screens, the unit tests and the Detox tests import them from
 * this file, so a rename cannot break a test without a type error.
 * Detox (Node.js) loads this file, so it imports only types and modules with
 * no imports. To get the ID of a part inside a component (for example the
 * error text of a field), use the part functions below:
 * `bannerTestIds(TestIds.form.errorBanner).reference`.
 */
export { attachmentTestIds, bannerTestIds, textFieldTestIds } from '@ledger/ui/testIdParts';

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
    event: (name: TraceEventName) => `trace-event-${name}`,
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
