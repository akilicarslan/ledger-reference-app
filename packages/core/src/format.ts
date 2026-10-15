import type { TransactionType } from '@ledger/contracts';

const LOCALE = 'en-US';
const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency });
    moneyFormatters.set(currency, formatter);
  }
  return formatter;
}

/** 1234.5 → "$1,234.50" */
export function formatMoney(amount: number, currency = 'USD'): string {
  return moneyFormatter(currency).format(amount);
}

/** Uses the real minus sign (U+2212), which screen readers read as "minus". */
const MINUS = '−';

/** Credit → "+$10.00", debit → "−$10.00". */
export function formatSignedMoney(amount: number, type: TransactionType, currency = 'USD'): string {
  return `${type === 'credit' ? '+' : MINUS}${formatMoney(amount, currency)}`;
}

/** 1.234 → "+1.23%" */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** "Oct 13, 2026, 09:30 AM" */
export function formatDateTime(value: string | number | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

/** "09:30:05 AM" */
export function formatTime(value: string | number | Date): string {
  return timeFormatter.format(new Date(value));
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  credit: 'Credit',
  debit: 'Debit',
};

/** 4915200 → "4.7 MB" */
export function formatBytes(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`;
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1)} KB`;
  return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;
}
