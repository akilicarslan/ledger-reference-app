import type { StockQuote } from '@ledger/contracts';

interface Listing {
  symbol: string;
  name: string;
  basePrice: number;
}

const LISTINGS: readonly Listing[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 228.4 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 431.2 },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', basePrice: 172.9 },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', basePrice: 189.3 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', basePrice: 118.6 },
  { symbol: 'META', name: 'Meta Platforms, Inc.', basePrice: 562.1 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', basePrice: 247.5 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', basePrice: 214.7 },
  { symbol: 'V', name: 'Visa Inc.', basePrice: 287.9 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', basePrice: 161.2 },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', basePrice: 579.8 },
  { symbol: 'PFE', name: 'Pfizer Inc.', basePrice: 29.1 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', basePrice: 452.3 },
  { symbol: 'KO', name: 'The Coca-Cola Company', basePrice: 70.4 },
];

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Mock market. Each quote moves the price at random by a maximum of ±3 %
 * from the base price. Inject `random` to get repeatable values in tests.
 */
export class StockMarket {
  constructor(
    private readonly random: () => number,
    private readonly now: () => Date,
  ) {}

  getQuotes(symbols: readonly string[]): StockQuote[] {
    const asOf = this.now().toISOString();
    return symbols.flatMap((symbol) => {
      const listing = LISTINGS.find((item) => item.symbol === symbol);
      if (!listing) return [];
      const changePercent = round2((this.random() - 0.5) * 6);
      const price = round2(listing.basePrice * (1 + changePercent / 100));
      return [
        {
          symbol: listing.symbol,
          name: listing.name,
          price,
          change: round2(price - listing.basePrice),
          changePercent,
          currency: 'USD' as const,
          asOf,
        },
      ];
    });
  }

  search(text: string, limit = 8): { symbol: string; name: string }[] {
    const needle = text.trim().toLowerCase();
    return LISTINGS.filter(
      (item) =>
        item.symbol.toLowerCase().startsWith(needle) || item.name.toLowerCase().includes(needle),
    )
      .slice(0, limit)
      .map(({ symbol, name }) => ({ symbol, name }));
  }
}
