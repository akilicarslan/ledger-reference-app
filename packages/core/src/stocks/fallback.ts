import type { StockQuote } from '@ledger/contracts';

/** Time of the bundled snapshot. The UI shows it, so users know the data is old. */
export const FALLBACK_AS_OF = '2026-10-01T20:00:00.000Z';

const snapshot = (symbol: string, name: string, price: number): StockQuote => ({
  symbol,
  name,
  price,
  change: 0,
  changePercent: 0,
  currency: 'USD',
  asOf: FALLBACK_AS_OF,
});

/**
 * Bundled snapshot. The app shows it when the market service fails and no
 * cached data exists. Better old data with a clear label than an empty screen.
 */
export const FALLBACK_QUOTES: readonly StockQuote[] = [
  snapshot('AAPL', 'Apple Inc.', 228.4),
  snapshot('MSFT', 'Microsoft Corporation', 431.2),
  snapshot('GOOGL', 'Alphabet Inc. Class A', 172.9),
  snapshot('AMZN', 'Amazon.com, Inc.', 189.3),
  snapshot('NVDA', 'NVIDIA Corporation', 118.6),
  snapshot('META', 'Meta Platforms, Inc.', 562.1),
  snapshot('TSLA', 'Tesla, Inc.', 247.5),
  snapshot('JPM', 'JPMorgan Chase & Co.', 214.7),
  snapshot('V', 'Visa Inc.', 287.9),
  snapshot('JNJ', 'Johnson & Johnson', 161.2),
  snapshot('UNH', 'UnitedHealth Group Incorporated', 579.8),
  snapshot('PFE', 'Pfizer Inc.', 29.1),
  snapshot('BRK.B', 'Berkshire Hathaway Inc. Class B', 452.3),
  snapshot('KO', 'The Coca-Cola Company', 70.4),
];

export function fallbackQuotesFor(symbols: readonly string[]): StockQuote[] {
  return symbols.flatMap((symbol) => FALLBACK_QUOTES.filter((quote) => quote.symbol === symbol));
}

/** Local search in the bundled list. The app uses it when the search service fails. */
export function searchFallback(text: string): { symbol: string; name: string }[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];
  return FALLBACK_QUOTES.filter(
    (quote) =>
      quote.symbol.toLowerCase().startsWith(needle) || quote.name.toLowerCase().includes(needle),
  ).map(({ symbol, name }) => ({ symbol, name }));
}
