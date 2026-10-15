# Implementation plan

This plan divides the work into phases. Each phase has tasks and acceptance criteria.
The "Status" column shows the result at delivery.

## 1. Scope

1. Record a transaction: date/time, amount (unsigned, maximum 2 decimals), type (debit or credit), title, description, optional image.
2. Refuse a transaction that makes the balance negative. Show the error message in the UI.
3. Show the balance and the last 5 transactions.
4. Give an HTTP API that sends only "200 OK" or "500 Internal Server Error".
5. Show mock stock data. The server makes it slow and makes it fail at random. The client retries, debounces and falls back.
6. Share one UI library between the React Native app and the React web app. Show it in Storybook.
7. Follow WCAG 2.1 Level AA (Section 504) on iOS, Android and the web.
8. Write unit tests, Detox tests and documents in ASD-STE100.

Out of scope: user accounts, more than one currency, a production database, a production deployment.

## 2. Phases

### Phase 1: Foundation

| Task                                                   | Acceptance criteria                                               | Status |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ------ |
| Create the pnpm workspace with `apps/` and `packages/` | `pnpm install` completes. One React and one React Native version. | Done   |
| Add the Expo SDK 57 app from the official template     | The app starts on the iOS simulator.                              | Done   |
| Add strict TypeScript for all packages                 | `pnpm typecheck` gives no errors.                                 | Done   |
| Add ESLint and Prettier                                | `pnpm lint` and `pnpm format:check` give no errors.               | Done   |

### Phase 2: API contract and server

| Task                                           | Acceptance criteria                                                                           | Status |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| Write the Zod schemas in `@ledger/contracts`   | Unit tests cover the amount rules, the defaults and the error shape.                          | Done   |
| Generate the OpenAPI 3.1 document from Zod     | `@readme/openapi-parser` accepts the document. `pnpm openapi:check` finds no difference.      | Done   |
| Write the ledger domain with integer cents     | 0.1 + 0.2 − 0.3 gives a balance of exactly 0. A debit below 0 is refused.                     | Done   |
| Write the Express routes and the error handler | Each endpoint sends 200 or 500. Supertest covers each endpoint.                               | Done   |
| Add chaos to the stock endpoints               | Delay and failure rate come from environment variables. Tests inject a fixed random function. | Done   |
| Serve Swagger UI                               | http://localhost:4000/docs shows the API.                                                     | Done   |

### Phase 3: Client logic

| Task                              | Acceptance criteria                                                                                  | Status |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| Write the typed API client        | It validates every response. It maps errors to `AppError`. It has a timeout.                         | Done   |
| Write the Redux slices and thunks | A refused debit sets `submit.error`. The balance does not change. A double submit sends one request. | Done   |
| Write the React Query hooks       | Tests show live, stale and fallback data, debounce and retry rules.                                  | Done   |
| Write the form validation         | The client uses the same Zod schema as the server. Messages tell the correct format.                 | Done   |

### Phase 4: Shared UI library

| Task                                    | Acceptance criteria                                                               | Status |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| Write the theme tokens (light and dark) | A unit test checks 4.5:1 for text and 3:1 for UI boundaries.                      | Done   |
| Write the components                    | Each component has a role, a name and a state. Touch targets are 48 × 48 or more. | Done   |
| Write the accessibility helpers         | `LiveRegion` announces on iOS, Android and the web.                               | Done   |
| Add Storybook with the a11y addon       | `pnpm build:storybook` completes. axe-core runs on each story.                    | Done   |

### Phase 5: Screens and apps

| Task                     | Acceptance criteria                                                                         | Status |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------ |
| Write the Account screen | The form records a transaction. The balance and the list update. Errors show in the banner. | Done   |
| Write the Markets screen | The UI shows the data source (Live, Delayed, Offline snapshot) and the retry count.         | Done   |
| Start the web app        | The same screens operate in the browser.                                                    | Done   |
| Start the mobile app     | The same screens operate on iOS and Android.                                                | Done   |

### Phase 6: Tests and documents

| Task                                                  | Acceptance criteria                                                               | Status                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Write the native component tests (jest-expo, RNTL 14) | The tests check the native roles, states and hints.                               | Done                                                                                                         |
| Write the Detox tests                                 | The tests record a credit and a debit, and see the refused debit.                 | Done. iOS only (decision of 2026-10-13). The iOS release build completes; the iOS run needs `applesimutils`. |
| Write the documents in STE                            | README, plan, architecture, accessibility, ADRs, AI workflow.                     | Done                                                                                                         |
| Write the two AI skills                               | `shared-ui-library` and `accessibility-review` in `.claude/skills`.               | Done                                                                                                         |
| Add CI                                                | GitHub Actions runs typecheck, lint, tests, contract check, builds and iOS Detox. | Done                                                                                                         |

### Phase 7: Native camera, tracing and data file

| Task                                           | Acceptance criteria                                                                           | Status |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| Write the Nitro spec and generate the bindings | `nitrogen` generates `Photo`, `LedgerCamera` and `PhotoView` for Swift and Kotlin.            | Done   |
| Implement the module on iOS and Android        | The release builds compile. `takePhoto` gives an RGBA `ArrayBuffer` that wraps native memory. | Done   |
| Show the photo with a native view              | `PhotoView` draws the `Photo` without a JavaScript round trip.                                | Done   |
| Analyze the pixels in JavaScript               | Unit tests for `analyzePixels`. The form warns about a dark photo.                            | Done   |
| Add W3C trace context                          | Client sends `traceparent`. Server sends `x-request-id`, stores `traceId`, records events.    | Done   |
| Show the trace in the app                      | Banners show the Reference ID. The Request trace card shows the server steps.                 | Done   |
| Keep the ledger in a JSON file                 | Atomic write, Zod validation, integrity check, seed data, reset command.                      | Done   |
| Test the new parts end to end                  | Detox reads the Reference ID from the screen and finds the same trace on the server.          | Done   |
| Document the new parts in STE                  | NATIVE-CAMERA.md, TRACING.md, DATA-STORAGE.md, ADR 0008 to 0010.                              | Done   |

## 3. Risks

| Risk                                               | Effect                                             | Mitigation                                                 |
| -------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| Floating-point errors in money                     | A wrong balance                                    | Calculate in integer cents (ADR 0005).                     |
| The API can send only 200 or 500                   | The client cannot use the status to find the error | Use a stable `error.code` (ADR 0004).                      |
| Two React copies in the monorepo                   | Runtime errors ("invalid hook call")               | pnpm `overrides` for `react`, `react-dom`, `react-native`. |
| react-native-web does not support all native props | Different accessibility on the web                 | `webOnlyProps()` for web ARIA. Tests on both renderers.    |

## 4. Possible next steps

1. Persist the ledger (SQLite on the server, or `expo-sqlite` for an offline-first mode).
2. Add an idempotency key to `POST /transactions` to make retries of a write safe.
3. Add `aria-describedby` support on Android when React Native supports it.
4. Run the Storybook stories as tests (`@storybook/addon-vitest`) in CI.
