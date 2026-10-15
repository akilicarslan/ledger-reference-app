import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  firstInvalidField,
  parseAmount,
  validateDraft,
} from '../src/forms/transactionForm';

const NOW = new Date('2026-10-13T09:00:00.000Z');

describe('parseAmount', () => {
  it.each([
    ['12', 12],
    ['12.5', 12.5],
    ['12,50', 12.5],
    [' 0.01 ', 0.01],
  ])('reads "%s" as %s', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['', 'abc', '1,234.50', '12.345', '-3', '1e3', '.5'])('refuses "%s"', (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe('validateDraft', () => {
  it('gives an error message for each empty required field', () => {
    const result = validateDraft(EMPTY_DRAFT, NOW);
    expect(result).toEqual({
      ok: false,
      errors: { title: 'Enter a title.', amount: 'Enter an amount.' },
    });
    if (!result.ok) expect(firstInvalidField(result.errors)).toBe('title');
  });

  it('refuses 0 and too many decimals', () => {
    expect(validateDraft({ ...EMPTY_DRAFT, title: 'x', amount: '0' }, NOW)).toMatchObject({
      ok: false,
      errors: { amount: 'Enter an amount more than 0.' },
    });
    expect(validateDraft({ ...EMPTY_DRAFT, title: 'x', amount: '1.999' }, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.stringContaining('maximum of 2 decimals') },
    });
  });

  it('creates the request body with the current time', () => {
    const result = validateDraft(
      {
        type: 'credit',
        title: '  Salary ',
        amount: '1500,00',
        description: ' Oct ',
        receiptImage: null,
      },
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        type: 'credit',
        title: 'Salary',
        amount: 1500,
        description: 'Oct',
        dateTime: NOW.toISOString(),
      },
    });
  });

  it('refuses an attachment that is not an image data URI', () => {
    const result = validateDraft(
      { ...EMPTY_DRAFT, title: 'x', amount: '1', receiptImage: 'file:///tmp/a.png' },
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      errors: { receiptImage: 'Select a PNG, JPEG or WebP image smaller than 1 MB.' },
    });
  });
});
