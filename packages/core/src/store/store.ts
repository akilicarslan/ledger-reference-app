import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { ApiClient } from '../api/client';
import { breadcrumbMiddleware } from '../diagnostics/errorReporting';
import type { ThunkExtra } from './createAppAsyncThunk';
import { accountSlice } from './accountSlice';
import { marketsSlice } from './marketsSlice';
import { transactionDraftSlice } from './transactionDraftSlice';

const rootReducer = combineReducers({
  [accountSlice.reducerPath]: accountSlice.reducer,
  [marketsSlice.reducerPath]: marketsSlice.reducer,
  [transactionDraftSlice.reducerPath]: transactionDraftSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Creates the Redux store. The API client is a dependency, so tests and
 * Storybook can give a fake client without network access.
 */
export function createLedgerStore(
  api: ApiClient,
  preloadedState?: Partial<RootState>,
  options: Omit<ThunkExtra, 'api'> = {},
) {
  const extraArgument: ThunkExtra = { api, ...options };
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument } }).concat(breadcrumbMiddleware),
  });
}

export type AppStore = ReturnType<typeof createLedgerStore>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
