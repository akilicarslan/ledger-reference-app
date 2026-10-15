# ADR 0011: Idempotency key for transaction writes

- Status: Accepted
- Date: 2026-10-15

## Context

A mobile network can lose a response. After a timeout, the client cannot know if the server recorded the transaction.

- If the client does not retry, the user can lose a transaction that the server did not record.
- If the client retries (or the user taps "Record" again), the server can record the same debit two times.

For a ledger, a duplicate debit is a serious error. Reads are safe to retry. Writes are not safe to retry without a rule.

## Decision

1. The client sends an `idempotency-key` header (UUID v4) with `POST /api/v1/transactions`. The header follows the IETF draft "The Idempotency-Key HTTP Header Field".
2. The server stores the key on the transaction in `ledger.json`. At start-up it builds a key index from the file, so the rule stays correct after a restart.
3. When the key is known and the body is the same, the server records nothing. It sends the stored transaction, the current balance and `idempotent-replayed: true`. The trace gets the event `ledger.transaction.replayed`.
4. When the key is known and the body is different, the server sends 500 with `IDEMPOTENCY_KEY_REUSED`.
5. The draft slice owns the key. The key stays the same while the form values stay the same. A changed value or a successful submit gives a new key. Thus a second tap after a timeout sends the same key.
6. The `submitTransaction` thunk retries temporary failures (`NETWORK_ERROR`, `TIMEOUT`, `INTERNAL_ERROR`) two times, after 400 ms and 1200 ms. All attempts use the same key and the same trace ID. The thunk does not retry business errors such as `INSUFFICIENT_FUNDS`.

## Alternatives

- **No retry for writes.** This is simple, but the user sees an error for a transaction that the server possibly recorded. The user then taps "Record" again and makes a duplicate.
- **Client-side duplicate check (same title and amount in the last N seconds).** Two real transactions can have the same data, for example two coffees. The server is the only place that can decide correctly.
- **Key in a separate table with an expiry time.** This is correct for production at scale. For one JSON file, the key on the transaction is simpler and needs no clean-up.

## Consequences

- A retry cannot make a duplicate transaction, also after a server restart.
- The key is optional in the API, so `curl` without the header still operates. The app always sends it.
- The response of a replay has the current balance, not the balance at the time of the first request. The UI needs the current balance, so this is correct for this app.
- The Request trace card shows the number of attempts and the `replayed` event. A reviewer can see the safe retry.
- Tests: `apps/server/test/idempotency.test.ts`, `packages/core/test/accountSlice.test.ts` (section "safe retry of a write").
