import {
  DESCRIPTION_MAX_LENGTH,
  MAX_TRANSACTION_AMOUNT,
  NewTransaction,
  TITLE_MAX_LENGTH,
  hasAtMostTwoDecimals,
  type NewTransactionInput,
  type TransactionType,
} from '@ledger/contracts';

/** Form values as the user types them. `amount` stays text until the user submits. */
export interface TransactionDraft {
  type: TransactionType;
  title: string;
  amount: string;
  description: string;
  receiptImage: string | null;
}

export type DraftField = keyof TransactionDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

export const EMPTY_DRAFT: TransactionDraft = {
  type: 'debit',
  title: '',
  amount: '',
  description: '',
  receiptImage: null,
};

/** The order of the fields on the screen. The UI moves focus to the first field with an error. */
export const DRAFT_FIELD_ORDER: readonly DraftField[] = [
  'type',
  'title',
  'amount',
  'description',
  'receiptImage',
];

const AMOUNT_PATTERN = /^\d+([.,]\d{1,2})?$/;

/**
 * Converts the amount text to a number. It accepts "." or "," as the
 * decimal separator and a maximum of 2 decimals. It refuses thousands separators.
 */
export function parseAmount(text: string): number | null {
  const value = text.trim();
  if (!AMOUNT_PATTERN.test(value)) return null;
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

export type DraftValidation =
  { ok: true; value: NewTransactionInput } | { ok: false; errors: DraftErrors };

/**
 * Validates the form. The messages tell the user what to do (WCAG 3.3.1 and 3.3.3).
 * At the end, the shared Zod schema checks the result again, so the client
 * and the server use the same rules.
 */
export function validateDraft(draft: TransactionDraft, now: Date = new Date()): DraftValidation {
  const errors: DraftErrors = {};
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (!title) errors.title = 'Enter a title.';
  else if (title.length > TITLE_MAX_LENGTH)
    errors.title = `Use ${TITLE_MAX_LENGTH} characters or fewer.`;

  const amount = parseAmount(draft.amount);
  if (!draft.amount.trim()) errors.amount = 'Enter an amount.';
  else if (amount === null || !hasAtMostTwoDecimals(amount))
    errors.amount = 'Enter a number with a maximum of 2 decimals, for example 12.50.';
  else if (amount <= 0) errors.amount = 'Enter an amount more than 0.';
  else if (amount > MAX_TRANSACTION_AMOUNT)
    errors.amount = 'Enter an amount of 1,000,000,000 or less.';

  if (description.length > DESCRIPTION_MAX_LENGTH)
    errors.description = `Use ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;

  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, errors };

  const value: NewTransactionInput = {
    type: draft.type,
    title,
    amount,
    description,
    dateTime: now.toISOString(),
    ...(draft.receiptImage ? { receiptImage: draft.receiptImage } : {}),
  };

  const parsed = NewTransaction.safeParse(value);
  if (!parsed.success) {
    const fallback: DraftErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && field in draft && !fallback[field as DraftField]) {
        fallback[field as DraftField] =
          field === 'receiptImage'
            ? 'Select a PNG, JPEG or WebP image smaller than 1 MB.'
            : 'Correct this value.';
      }
    }
    return { ok: false, errors: fallback };
  }
  return { ok: true, value };
}

export function firstInvalidField(errors: DraftErrors): DraftField | undefined {
  return DRAFT_FIELD_ORDER.find((field) => errors[field]);
}
