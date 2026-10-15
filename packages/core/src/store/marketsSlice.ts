import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'JNJ', 'UNH'] as const;
export const MAX_WATCHLIST_LENGTH = 10;

export interface MarketsState {
  watchlist: string[];
}

const initialState: MarketsState = { watchlist: [...DEFAULT_WATCHLIST] };

/** UI state for the Markets screen. Server data (quotes) stays in React Query. */
export const marketsSlice = createSlice({
  name: 'markets',
  initialState,
  reducers: {
    symbolAdded(state, action: PayloadAction<string>) {
      const symbol = action.payload.toUpperCase();
      if (state.watchlist.includes(symbol) || state.watchlist.length >= MAX_WATCHLIST_LENGTH)
        return;
      state.watchlist.push(symbol);
    },
    symbolRemoved(state, action: PayloadAction<string>) {
      state.watchlist = state.watchlist.filter((symbol) => symbol !== action.payload);
    },
  },
});

export const { symbolAdded, symbolRemoved } = marketsSlice.actions;
export const selectWatchlist = (state: { markets: MarketsState }) => state.markets.watchlist;
