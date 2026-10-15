# ADR 0004: Only 200 and 500, with a stable error code

- Status: Accepted
- Date: 2026-10-13

## Context

The assignment says that the API responds with "200 OK" or "500 Internal Server Error".
HTTP usually uses 4xx for client errors (for example 400 for bad data, 422 for a business rule).
If all errors use 500, the client cannot use the status to find the cause.

## Decision

1. The API sends 200 for a successful request.
2. The API sends 500 for each error, also for validation errors and for a refused transaction.
3. The body of each error has the same shape: `{ "error": { "code", "message", "details?" } }`.
4. `error.code` is a closed list (`ErrorCode` in `@ledger/contracts`). Clients use the code, not the status.
5. `error.message` is a message in STE that the UI can show without a change.

## Consequences

- The API follows the assignment.
- The client decides the retry policy from the code: `INSUFFICIENT_FUNDS` and `VALIDATION_FAILED` are not retried.
- Generic HTTP tools (proxies, monitoring) see client errors as server errors. In a production API, use 400/409/422 for client errors. Only the status mapping in `apps/server/src/http/errors.ts` must change.
