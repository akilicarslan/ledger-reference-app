# ADR 0007: Zod schemas as the single source of truth for the API

- Status: Accepted
- Date: 2026-10-13

## Context

The assignment asks for an OpenAPI (Swagger) document for the mock server and validation with Zod.
A hand-written OpenAPI document and separate Zod schemas can become different.

## Decision

1. Write each API schema one time, in Zod, in `@ledger/contracts`.
2. Give each component schema an `id` with `.meta()`.
3. Generate the OpenAPI 3.1 components with `z.toJSONSchema()` (JSON Schema 2020-12 is the OpenAPI 3.1 dialect).
4. Use the "input" view for request bodies (fields with a default are optional) and the "output" view for responses.
5. Write the generated document to `apps/server/openapi.json`. CI runs `pnpm openapi:check` and fails if the file is old.
6. The server validates each request with the same schemas. The client validates each response with the same schemas.

## Consequences

- The document, the server and the client cannot disagree without a failed check.
- `@readme/openapi-parser` validates the generated document in a unit test.
- The paths section is TypeScript code. A new endpoint needs a change in `openapi.ts` and in `app.ts`. A route test finds a missing path.
