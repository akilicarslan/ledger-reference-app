# ADR 0005: Money calculations in integer cents

- Status: Accepted
- Date: 2026-10-13

## Context

The assignment defines the amount as an unsigned floating-point value.
Binary floating point cannot hold most decimal fractions exactly. For example, `0.1 + 0.2` gives `0.30000000000000004`.
A balance that adds many such values becomes wrong.

## Decision

1. The API accepts a floating-point amount, as the assignment requires.
2. The amount must be more than 0 and have a maximum of 2 decimal places (Zod `positive()` and `multipleOf(0.01)`).
3. The server converts each amount to integer cents (`toCents`) before a calculation.
4. The server keeps the balance in integer cents. It converts to a decimal amount only for the response.

## Consequences

- A test shows that 0.10 + 0.20 − 0.30 gives a balance of exactly 0.
- A debit that makes the balance exactly 0 is accepted. A debit 1 cent more is refused.
- "Unsigned" in the assignment allows 0. We refuse 0, because a transaction of 0 has no effect.
