# ADR 0009: End-to-end tracing with W3C Trace Context

- Status: Accepted
- Date: 2026-10-13

## Context

A user can report "my transaction was refused" or "the app showed an error". Support must find the server steps of that one action. Without a shared ID, the client error, the server log and the stored data are not connected.

## Decision

1. Use the W3C Trace Context header `traceparent` (the OpenTelemetry format).
2. Create one trace ID for each user action in the Redux thunk. Create one span ID for each HTTP request.
3. The server continues the trace, records each step (JSON log line and `traces.jsonl`), and sends the trace ID back in `x-request-id` and in error bodies.
4. Store the trace ID on each recorded transaction.
5. Show the trace ID in the UI as the "Reference ID" and in a Request trace card.
6. Expose `GET /api/v1/traces/{traceId}` for diagnostics.

## Alternatives

- A custom `x-request-id` only: simple, but not compatible with tracing tools.
- The full OpenTelemetry SDK: correct, but large for a local showcase. The header format is the same, so this change is possible later.

## Consequences

- One ID connects the UI, the HTTP request, the log, the trace file and the stored transaction.
- The Detox test reads the Reference ID from the screen and finds the same trace on the server.
- The trace file grows. A reset command deletes it.
