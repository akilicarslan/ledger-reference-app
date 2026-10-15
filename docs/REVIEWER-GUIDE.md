# Reviewer guide

This guide is for a person who reviews the repository. It tells you what to look at first, which decisions are important, and where the evidence is. Time: 5 to 15 minutes.

## Contents

1. [See the app in 2 minutes](#1-see-the-app-in-2-minutes)
2. [Where to look first](#2-where-to-look-first)
3. [Important decisions and their trade-offs](#3-important-decisions-and-their-trade-offs)
4. [Evidence](#4-evidence)
5. [Known limits](#5-known-limits)
6. [What I would do next](#6-what-i-would-do-next)
7. [Demo script (2 minutes)](#7-demo-script-2-minutes)

## 1. See the app in 2 minutes

![Demo: take a receipt photo, record a debit, see the refused debit and the request trace](media/demo.gif)

You can see the web version without Xcode:

```sh
pnpm install
pnpm dev:server   # terminal 1: API on http://localhost:4000 (Swagger UI on /docs)
pnpm dev:web      # terminal 2: web app on http://localhost:5173
```

The web app uses the same screens, state and UI library as the iOS app. Only the camera is different (the web has "Add image" only).

To check everything without a device:

```sh
pnpm verify       # typecheck, lint, 212 unit tests, OpenAPI check, React Compiler report
```

## 2. Where to look first

| Order | File                                                                                                                  | Why it is interesting                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1     | [`packages/contracts/src/schemas.ts`](../packages/contracts/src/schemas.ts)                                           | One Zod schema gives the TypeScript types, the server validation, the client validation and the OpenAPI document |
| 2     | [`apps/server/src/domain/ledger.ts`](../apps/server/src/domain/ledger.ts)                                             | Ledger rules: integer cents, no negative balance, idempotent writes, integrity check at start-up                 |
| 3     | [`packages/core/src/store/accountSlice.ts`](../packages/core/src/store/accountSlice.ts)                               | One trace ID for each user action; safe automatic retry of a write                                               |
| 4     | [`packages/core/src/stocks/`](../packages/core/src/stocks/)                                                           | React Query against a slow server that fails at random: retry, backoff, debounce, fallback data                  |
| 5     | [`packages/native-camera/src/specs/LedgerCamera.nitro.ts`](../packages/native-camera/src/specs/LedgerCamera.nitro.ts) | Nitro module: the pixels are native memory that JavaScript reads as an `ArrayBuffer`, with no copy               |
| 6     | [`packages/ui/src/components/TextField.tsx`](../packages/ui/src/components/TextField.tsx)                             | How one component maps to the web (ARIA), iOS (VoiceOver) and Android (TalkBack)                                 |
| 7     | [`packages/features/src/account/TransactionForm.tsx`](../packages/features/src/account/TransactionForm.tsx)           | The screen that brings it all together; the same file runs on iOS and on the web                                 |
| 8     | [`.claude/skills/`](../.claude/skills/) and [`CLAUDE.md`](../CLAUDE.md)                                               | How the AI agent was controlled: rules, skills and checks                                                        |

## 3. Important decisions and their trade-offs

| Decision                                                   | What I gave up                                             | ADR                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Redux Toolkit for account data, React Query for stock data | Two state tools. Each one does the work that it is good at | [0003](adr/0003-redux-toolkit-and-react-query.md)        |
| Only 200 and 500, with a stable `error.code`               | HTTP status codes do not carry meaning (assignment rule)   | [0004](adr/0004-error-contract-200-500.md)               |
| One UI library for mobile and web (react-native-web)       | Some web-only ARIA needs a small adapter (`webOnlyProps`)  | [0006](adr/0006-shared-ui-with-react-native-web.md)      |
| Zod as the single source of truth                          | The OpenAPI document is generated, not written by hand     | [0007](adr/0007-zod-as-single-source-of-truth.md)        |
| Nitro module with zero-copy pixels                         | Native code to maintain (Swift and Kotlin)                 | [0008](adr/0008-nitro-camera-zero-copy.md)               |
| Idempotency key for writes                                 | One more header and a key index on the server              | [0011](adr/0011-idempotency-key-for-writes.md)           |
| Error boundaries and a pluggable error reporter            | No real crash service in the showcase                      | [0012](adr/0012-error-boundaries-and-error-reporting.md) |
| React Compiler on, checked in `pnpm verify`                | 4 functions had to change to compile                       | [0013](adr/0013-react-compiler.md)                       |

## 4. Evidence

| Claim                                                     | Evidence                                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The rules are tested                                      | 212 unit tests (`pnpm test`), on 3 renderers: Node.js, react-native-web (DOM) and the React Native test renderer                       |
| The app operates on iOS end to end                        | Detox tests in `apps/mobile/e2e/` (results in section 4.1)                                                                             |
| The camera path does not copy the pixels                  | Measured on the iOS simulator: 4.7 MB shared, native decode 4 ms, JS analysis 1.9 ms ([NATIVE-CAMERA.md](NATIVE-CAMERA.md), section 9) |
| A retry cannot record a transaction two times             | `apps/server/test/idempotency.test.ts`, also after a server restart                                                                    |
| The API document agrees with the code                     | `pnpm openapi:check` fails when `openapi.json` is old                                                                                  |
| All components are memoized by the React Compiler         | `pnpm compiler:report`: 34 compiled, 0 failed                                                                                          |
| Colors meet WCAG 2.1 AA contrast in light and dark themes | `packages/ui/test/contrast.test.ts` checks every text and background token pair                                                        |
| One Reference ID connects the UI, the logs and the data   | Detox test "traces the refused debit end to end"; [TRACING.md](TRACING.md)                                                             |
| Error reports contain no personal data                    | `packages/core/test/errorReporting.test.ts` ("does not put form values or amounts in the report")                                      |

### 4.1 iOS end-to-end results

Run on 2026-10-15: iPhone 17 Pro simulator (iOS 26.5), release build, Apple silicon Mac. Two runs in sequence, both green.

| Suite            | Test                                                                         | Result |
| ---------------- | ---------------------------------------------------------------------------- | ------ |
| `account.e2e.ts` | Shows a balance of $0.00 and an empty history at the first start             | Pass   |
| `account.e2e.ts` | Shows field errors when the user submits an empty form                       | Pass   |
| `account.e2e.ts` | Records a credit and updates the balance                                     | Pass   |
| `account.e2e.ts` | Records a debit (expense)                                                    | Pass   |
| `account.e2e.ts` | Refuses a debit that makes the balance negative and shows the server message | Pass   |
| `account.e2e.ts` | Traces the refused debit end to end: the UI reference is the server trace    | Pass   |
| `account.e2e.ts` | Lists the newest transaction first, with one accessible label per row        | Pass   |
| `camera.e2e.ts`  | Shows the native preview and the shared-memory details (Nitro module)        | Pass   |

Total: 8 of 8 passed, about 2 minutes. To run them: `pnpm e2e:build:ios && pnpm e2e:test:ios` (README section 7).

## 5. Known limits

- **No authentication.** There is one local account. [SECURITY-PRIVACY.md](SECURITY-PRIVACY.md) gives the production changes.
- **The data is a JSON file.** It is good for a showcase and one process. It is not good for many server instances ([ADR 0010](adr/0010-json-file-storage.md)).
- **No offline mode.** The app needs the server. An offline write queue would use the same idempotency key, so the design is ready for it.
- **Android.** The app and the Kotlin camera code build, but the project has no Android end-to-end tests (iOS only, by decision).
- **No real crash service.** `setErrorReporter` is the connection point.

## 6. What I would do next

1. Offline write queue (persisted Redux slice) that sends with the existing idempotency keys.
2. Authentication with OIDC and PKCE, tokens in the Keychain.
3. Privacy cover in the app switcher and an optional biometric lock.
4. EAS build profiles and over-the-air updates with a staged rollout.
5. Run Detox in CI on a macOS runner for each pull request.

## 7. Demo script (2 minutes)

| Time | Do                                                                        | Say                                                                                                  |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0:00 | Open the app. Show the balance and the last 5 transactions.               | "One Expo app and one web app. Same screens, same state, same UI library."                           |
| 0:15 | Select **Debit**. Type a title and an amount. Select **Take photo**.      | "The photo is native memory. JavaScript reads it as an ArrayBuffer. There is no copy and no base64." |
| 0:40 | Select **Record debit**. Show the new balance and the Request trace card. | "Each user action has one W3C trace ID. The card shows the server steps for this ID."                |
| 1:00 | Type an amount that is more than the balance. Select **Record debit**.    | "The server refuses it. The UI shows the server message and the Reference ID for support."           |
| 1:20 | Open the **Markets** tab.                                                 | "The mock server is slow and fails at random. React Query retries, then shows fallback data."        |
| 1:40 | Turn on VoiceOver (or show `docs/ACCESSIBILITY.md`).                      | "Each component maps to VoiceOver, TalkBack and ARIA. The contrast is tested in both themes."        |
| 1:55 | Show `pnpm verify`.                                                       | "212 tests, the OpenAPI check and the React Compiler report run in CI."                              |
