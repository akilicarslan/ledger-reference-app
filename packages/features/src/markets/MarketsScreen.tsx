import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { StockQuote } from '@ledger/contracts';
import {
  FALLBACK_AS_OF,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatTime,
  selectWatchlist,
  symbolAdded,
  symbolRemoved,
  useAppDispatch,
  useAppSelector,
  useStockQuotes,
  useStockSearch,
  type DataSource,
  type StockQuotesResult,
} from '@ledger/core';
import {
  Badge,
  Banner,
  Button,
  Card,
  List,
  ListItem,
  LiveRegion,
  Skeleton,
  Text,
  TextField,
  useTheme,
  type BadgeTone,
} from '@ledger/ui';
import { TestIds } from '../testIds';

const SOURCE_BADGE: Record<DataSource, { label: string; tone: BadgeTone }> = {
  loading: { label: 'Loading', tone: 'neutral' },
  live: { label: 'Live', tone: 'success' },
  stale: { label: 'Delayed', tone: 'warning' },
  fallback: { label: 'Offline snapshot', tone: 'warning' },
};

function statusText(result: StockQuotesResult): string {
  if (result.isFetching && result.failureCount > 0) {
    return `The request failed. Retry ${result.failureCount} of ${result.maxRetries} is in progress.`;
  }
  switch (result.source) {
    case 'loading':
      return 'Loading quotes.';
    case 'live':
      return result.updatedAt
        ? `Updated at ${formatTime(result.updatedAt)}. The app refreshes every 30 seconds.`
        : '';
    case 'stale':
      return `The last refresh failed. The quotes are from ${result.updatedAt ? formatTime(result.updatedAt) : 'an earlier request'}.`;
    case 'fallback':
      return `The market service is not available. The app shows saved prices from ${formatDateTime(FALLBACK_AS_OF)}.`;
  }
}

function describeQuote(quote: StockQuote): string {
  const direction = quote.change > 0 ? 'up' : quote.change < 0 ? 'down' : 'unchanged';
  return `${quote.symbol}, ${quote.name}, ${formatMoney(quote.price, quote.currency)}, ${direction} ${formatPercent(quote.changePercent)}`;
}

function WatchlistCard() {
  const theme = useTheme();
  const watchlist = useAppSelector(selectWatchlist);
  const result = useStockQuotes(watchlist);
  const badge = SOURCE_BADGE[result.source];
  const status = statusText(result);
  const degraded = result.source === 'stale' || result.source === 'fallback';

  return (
    <Card
      title="Watchlist"
      subtitle="Mock prices. The server adds a random delay and fails at random."
      headerAction={<Badge label={badge.label} tone={badge.tone} testID={TestIds.markets.status} />}
    >
      <LiveRegion politeness="polite" message={degraded ? status : null}>
        {degraded ? (
          <Banner
            tone="warning"
            title={result.source === 'fallback' ? 'Showing saved prices' : 'Showing delayed prices'}
            message={status}
            action={{ label: 'Try again', onPress: result.refetch }}
          />
        ) : (
          <Text variant="caption" tone="muted">
            {status}
          </Text>
        )}
      </LiveRegion>

      {result.source === 'loading' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </View>
      ) : (
        <List accessibilityLabel="Watchlist quotes">
          {result.quotes.map((quote) => {
            const tone = quote.change > 0 ? 'success' : quote.change < 0 ? 'danger' : 'muted';
            const arrow = quote.change > 0 ? '▲' : quote.change < 0 ? '▼' : '•';
            return (
              <ListItem
                key={quote.symbol}
                testID={TestIds.markets.quoteRow(quote.symbol)}
                title={quote.symbol}
                subtitle={quote.name}
                accessibilityLabel={describeQuote(quote)}
                trailing={
                  <>
                    <Text variant="bodyStrong" tabular align="right">
                      {formatMoney(quote.price, quote.currency)}
                    </Text>
                    <Text variant="caption" tone={tone} tabular align="right">
                      {`${arrow} ${formatPercent(quote.changePercent)}`}
                    </Text>
                  </>
                }
              />
            );
          })}
        </List>
      )}
    </Card>
  );
}

function SearchCard() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const watchlist = useAppSelector(selectWatchlist);
  const [text, setText] = useState('');
  const search = useStockSearch(text);

  const busy = search.isDebouncing || search.isFetching;
  const resultMessage =
    search.source === 'idle' || busy
      ? null
      : `${search.results.length} ${search.results.length === 1 ? 'result' : 'results'} for "${search.query}".`;

  return (
    <Card title="Find stocks" subtitle="The search starts when you stop typing (debounce: 350 ms).">
      <TextField
        label="Symbol or company name"
        hint="For example AAPL or Pfizer."
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        testID={TestIds.markets.search}
      />
      <LiveRegion politeness="polite" message={resultMessage}>
        <Text variant="caption" tone="muted">
          {busy ? 'Searching…' : (resultMessage ?? 'Type to search.')}
        </Text>
      </LiveRegion>
      {search.source === 'fallback' ? (
        <Banner
          tone="info"
          title="Search from the saved list"
          message="The search service is not available. The results come from the list in the app."
        />
      ) : null}
      <View style={{ gap: theme.spacing.sm }}>
        {search.results.map((item) => {
          const inList = watchlist.includes(item.symbol);
          return (
            <View
              key={item.symbol}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                flexWrap: 'wrap',
              }}
            >
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text variant="bodyStrong">{item.symbol}</Text>
                <Text variant="caption" tone="muted">
                  {item.name}
                </Text>
              </View>
              <Button
                label={inList ? `Remove ${item.symbol}` : `Add ${item.symbol}`}
                variant={inList ? 'ghost' : 'secondary'}
                accessibilityHint={
                  inList
                    ? 'Removes the stock from the watchlist.'
                    : 'Adds the stock to the watchlist.'
                }
                onPress={() =>
                  dispatch(inList ? symbolRemoved(item.symbol) : symbolAdded(item.symbol))
                }
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export function MarketsScreen() {
  const theme = useTheme();
  return (
    <ScrollView
      testID={TestIds.markets.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
    >
      <WatchlistCard />
      <SearchCard />
    </ScrollView>
  );
}
