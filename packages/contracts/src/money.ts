/**
 * Money helpers.
 *
 * The API contract uses an unsigned floating-point amount (the assignment
 * requires this). Binary floating point cannot hold most decimal fractions
 * exactly, so every calculation converts the amount to integer cents first.
 */

/** The largest amount that one transaction can have. */
export const MAX_TRANSACTION_AMOUNT = 1_000_000_000;

/** Converts a decimal amount (for example 12.5) to integer cents (1250). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Converts integer cents (1250) to a decimal amount (12.5). */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Returns true when the amount has a maximum of 2 decimal places. */
export function hasAtMostTwoDecimals(amount: number): boolean {
  return Math.abs(toCents(amount) - amount * 100) < 1e-6;
}
