# ADR 0012: Error boundaries and error reporting

- Status: Accepted
- Date: 2026-10-15

## Context

Before this decision, a render error in one component stopped the full app. On a release build, the user saw an empty screen and support had no information.

## Decision

1. **Error boundaries.** `ErrorBoundary` (`packages/features/src/ErrorBoundary.tsx`) is on two levels:
   - one boundary for each tab in `AppShell`. An error in the Markets tab does not stop the Account tab or the tab bar. The boundary resets when the user selects a different tab.
   - one boundary around the full app in `AppProviders`, as the last line of defence.
2. **Fallback.** The fallback tells the user what happened and what to do (WCAG 3.3.1), gives a "Try again" button and shows a Reference ID. An assertive live region announces it (VoiceOver and TalkBack).
3. **Reporter.** `reportError` (`packages/core/src/diagnostics/errorReporting.ts`) makes a report with a new W3C trace ID as `reportId`. The default reporter writes one JSON line to the console. A production app gives its own reporter with `setErrorReporter` (for example Sentry or Crashlytics).
4. **Global handlers.** `installGlobalErrorHandlers()` reports errors that no boundary catches: the React Native `ErrorUtils` handler on mobile, and the `error` and `unhandledrejection` events on the web. The previous handler still runs, so the development red box and the release crash behavior do not change.
5. **Breadcrumbs without personal data.** A Redux middleware keeps the type of the last 20 actions (for example `account/submitTransaction/rejected`). It does not keep the payload. A test makes sure that a report has no titles and no amounts.

## Alternatives

- **A crash-reporting SDK now.** This needs an account, a DSN and native set-up. It adds nothing to the review of the architecture. The `ErrorReporter` interface keeps this change to one file.
- **`react-error-boundary` package.** It is good, but the class component is 50 lines and has no dependency.

## Consequences

- One broken section does not stop the app. The user can continue to record transactions.
- The Reference ID in the fallback works like the Reference ID of a request (see [TRACING.md](../TRACING.md)). Support uses one procedure for both.
- The React Compiler does not optimize class components. The boundary has no state that changes often, so this has no performance effect.
- Tests: `packages/features/test/ErrorBoundary.test.tsx`, `packages/core/test/errorReporting.test.ts`.
