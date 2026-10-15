# ADR 0001: pnpm monorepo with apps/ and packages/

- Status: Accepted
- Date: 2026-10-13

## Context

The mobile app, the web app and the server use the same API contract.
The mobile app and the web app use the same UI and the same screens.
Copies of this code in each app would become different over time.

## Decision

1. Use one pnpm workspace with two folders: `apps/` (runnable apps) and `packages/` (libraries).
2. An app can use a package. A package cannot use an app.
3. A package has no build step. Its `main` field points to `src/index.ts`. Metro, Vite, Vitest and tsx compile the source.
4. Use `workspace:*` for internal dependencies.
5. Use pnpm `overrides` to keep one version of `react`, `react-dom` and `react-native`.

## Consequences

- A change in a package is visible in all apps at once. No publish step is necessary.
- Each tool that reads the packages must compile TypeScript. All the tools in this repository do this.
- A package cannot be published to npm without a build step. This is not a requirement now.
