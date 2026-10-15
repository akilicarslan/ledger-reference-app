import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { newIdempotencyKey } from '@ledger/contracts';
import { EMPTY_DRAFT, type DraftField, type TransactionDraft } from '../forms/transactionForm';
import { submitTransaction } from './accountSlice';

export interface TransactionDraftState extends TransactionDraft {
  /**
   * The idempotency key of this draft. It stays the same while the values stay
   * the same, so a second submit after a timeout cannot record the
   * transaction two times. A changed value or a successful submit gives a new key.
   */
  idempotencyKey: string;
}

const emptyDraft = (type: TransactionDraft['type']): TransactionDraftState => ({
  ...EMPTY_DRAFT,
  type,
  idempotencyKey: newIdempotencyKey(),
});

/**
 * The form values live in Redux, not in component state. The user does not
 * lose typed values when the tab changes or the layout changes (for example
 * after a device rotation).
 */
export const transactionDraftSlice = createSlice({
  name: 'transactionDraft',
  initialState: (): TransactionDraftState => emptyDraft(EMPTY_DRAFT.type),
  reducers: {
    draftFieldChanged: {
      reducer(
        state,
        action: PayloadAction<{ field: DraftField; value: TransactionDraft[DraftField] }>,
      ) {
        const { field, value } = action.payload;
        if (state[field] === value) return;
        (state as Record<DraftField, unknown>)[field] = value;
        // New values are a new transaction: a new key.
        state.idempotencyKey = newIdempotencyKey();
      },
      prepare<K extends DraftField>(field: K, value: TransactionDraft[K]) {
        return { payload: { field, value } };
      },
    },
    draftReset(state) {
      return emptyDraft(state.type);
    },
  },
  extraReducers: (builder) => {
    // After a successful submit, clear the form and keep the selected type.
    builder.addCase(submitTransaction.fulfilled, (state) => emptyDraft(state.type));
  },
});

export const { draftFieldChanged, draftReset } = transactionDraftSlice.actions;
export const selectDraft = (state: { transactionDraft: TransactionDraftState }) =>
  state.transactionDraft;
