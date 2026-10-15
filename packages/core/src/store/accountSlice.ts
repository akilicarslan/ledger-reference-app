import { createSlice } from '@reduxjs/toolkit';
import {
  RECENT_TRANSACTIONS_DEFAULT_LIMIT,
  newIdempotencyKey,
  newTraceId,
  type Balance,
  type NewTransactionInput,
  type Transaction,
} from '@ledger/contracts';
import { isRetryable, toAppError, type AppError, type ClientTrace } from '../api/errors';
import { createAppAsyncThunk } from './createAppAsyncThunk';

export type RequestStatus = 'idle' | 'pending' | 'succeeded' | 'failed';

export interface AccountState {
  balance: Balance | null;
  /** The last transactions, newest first. Maximum: RECENT_TRANSACTIONS_DEFAULT_LIMIT. */
  recent: Transaction[];
  load: { status: RequestStatus; error: AppError | null };
  submit: {
    status: RequestStatus;
    error: AppError | null;
    lastTransaction: Transaction | null;
    /** The trace of the last submit (success or failure). The UI shows it as the Reference ID. */
    trace: ClientTrace | null;
  };
}

export const initialAccountState: AccountState = {
  balance: null,
  recent: [],
  load: { status: 'idle', error: null },
  submit: { status: 'idle', error: null, lastTransaction: null, trace: null },
};

/**
 * Starts the trace of one user action. `finish()` gives the client view of
 * the trace: the ID and the time from start to the last response.
 */
function startUserAction(): {
  traceId: string;
  finish: (attempts?: number) => ClientTrace;
} {
  const traceId = newTraceId();
  const startedAt = new Date();
  const start = Date.now();
  return {
    traceId,
    finish: (attempts = 1) => ({
      traceId,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - start,
      attempts,
    }),
  };
}

/** Default wait times before the automatic retries of a write. */
export const WRITE_RETRY_DELAYS_MS: readonly number[] = [400, 1200];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface SubmitTransactionArgs {
  input: NewTransactionInput;
  /**
   * One key for one transaction that the user wants to record. The draft
   * slice keeps it, so a second tap on "Record" after a timeout sends the same
   * key. If you do not give one, the thunk creates one for its own retries.
   */
  idempotencyKey?: string;
}

type WithAccount = { account: AccountState };

/** Reads the balance and the last 5 transactions in parallel. */
export const fetchAccount = createAppAsyncThunk(
  'account/fetch',
  async (_: void, { extra, rejectWithValue, signal }) => {
    // One user action, two HTTP requests, one trace ID.
    const action = startUserAction();
    const options = { signal, traceId: action.traceId };
    try {
      const [balance, recent] = await Promise.all([
        extra.api.getBalance(options),
        extra.api.getRecentTransactions(RECENT_TRANSACTIONS_DEFAULT_LIMIT, options),
      ]);
      return { balance, recent, trace: action.finish() };
    } catch (error) {
      return rejectWithValue({
        ...toAppError(error),
        traceId: action.traceId,
        trace: action.finish(),
      });
    }
  },
  {
    condition: (_, { getState }) => (getState() as WithAccount).account.load.status !== 'pending',
  },
);

/**
 * Writes one transaction. If the server refuses it (for example
 * INSUFFICIENT_FUNDS), the error goes to `submit.error` and the UI shows it.
 *
 * A write is not safe to retry by default: after a timeout, the client cannot
 * know if the server recorded the transaction. The idempotency key makes the
 * retry safe, so the thunk retries temporary failures (network error, timeout,
 * 500 INTERNAL_ERROR) with the same key and the same trace ID. It does not
 * retry business errors such as INSUFFICIENT_FUNDS.
 */
export const submitTransaction = createAppAsyncThunk(
  'account/submitTransaction',
  async ({ input, idempotencyKey }: SubmitTransactionArgs, { extra, rejectWithValue }) => {
    const action = startUserAction();
    const options = {
      traceId: action.traceId,
      idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
    };
    const retryDelays = extra.writeRetryDelaysMs ?? WRITE_RETRY_DELAYS_MS;
    for (let attempt = 1; ; attempt += 1) {
      try {
        const result = await extra.api.createTransaction(input, options);
        return { ...result, trace: action.finish(attempt) };
      } catch (error) {
        const appError = toAppError(error);
        const delay = retryDelays[attempt - 1];
        if (delay !== undefined && isRetryable(appError)) {
          await wait(delay);
          continue;
        }
        return rejectWithValue({
          ...appError,
          traceId: action.traceId,
          trace: action.finish(attempt),
        });
      }
    }
  },
  {
    // Prevents a double submit while a request is in progress.
    condition: (_, { getState }) => (getState() as WithAccount).account.submit.status !== 'pending',
  },
);

export const accountSlice = createSlice({
  name: 'account',
  initialState: initialAccountState,
  reducers: {
    submitStatusCleared(state) {
      state.submit = { status: 'idle', error: null, lastTransaction: null, trace: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccount.pending, (state) => {
        state.load = { status: 'pending', error: null };
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.recent = action.payload.recent;
        state.load = { status: 'succeeded', error: null };
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        if (action.meta.aborted) {
          // A cancelled request is not an error for the user.
          state.load = { status: 'idle', error: null };
          return;
        }
        state.load = {
          status: 'failed',
          error: action.payload ?? {
            code: 'INTERNAL_ERROR',
            message: 'The account data cannot be loaded.',
          },
        };
      })
      .addCase(submitTransaction.pending, (state) => {
        state.submit = { status: 'pending', error: null, lastTransaction: null, trace: null };
      })
      .addCase(submitTransaction.fulfilled, (state, action) => {
        const { transaction, balance, trace } = action.payload;
        state.balance = balance;
        state.recent = [
          transaction,
          ...state.recent.filter((item) => item.id !== transaction.id),
        ].slice(0, RECENT_TRANSACTIONS_DEFAULT_LIMIT);
        state.submit = { status: 'succeeded', error: null, lastTransaction: transaction, trace };
      })
      .addCase(submitTransaction.rejected, (state, action) => {
        state.submit = {
          status: 'failed',
          error: action.payload ?? {
            code: 'INTERNAL_ERROR',
            message: 'The transaction was not recorded.',
          },
          lastTransaction: null,
          trace: action.payload?.trace ?? null,
        };
      });
  },
});

export const { submitStatusCleared } = accountSlice.actions;

export const selectBalance = (state: WithAccount) => state.account.balance;
export const selectRecentTransactions = (state: WithAccount) => state.account.recent;
export const selectAccountLoad = (state: WithAccount) => state.account.load;
export const selectSubmit = (state: WithAccount) => state.account.submit;
