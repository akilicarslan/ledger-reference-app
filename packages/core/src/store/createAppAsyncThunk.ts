import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ApiClient } from '../api/client';
import type { AppError } from '../api/errors';

/** Services that thunks receive through `extra`. Tests inject fakes here. */
export interface ThunkExtra {
  api: ApiClient;
  /**
   * Wait times before each automatic retry of a write. The number of items is
   * the maximum number of retries. Tests give `[0, 0]`.
   */
  writeRetryDelaysMs?: readonly number[];
}

/**
 * `createAsyncThunk` with the app types. The state type is `unknown` here to
 * prevent a circular import with store.ts; slices select their own state.
 */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  extra: ThunkExtra;
  rejectValue: AppError;
}>();
