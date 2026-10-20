<h1 align="center">Ledger</h1>

<p align="center">
  <b>A production-grade React Native reference app.</b><br />
  One TypeScript codebase for iOS, Android and web: shared screens and state, an accessible UI library, one typed API contract and a zero-copy native camera module.
</p>

<p align="center">
  <sub>It started as a take-home brief. I built it as I would build a production app.</sub>
</p>

<p align="center">
  <a href="https://github.com/akilicarslan/ledger-reference-app/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/akilicarslan/ledger-reference-app/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white" />
  <img alt="React Native 0.86, New Architecture" src="https://img.shields.io/badge/React%20Native-0.86%20New%20Arch-61DAFB?logo=react&logoColor=black" />
  <img alt="212 unit tests, 8 Detox tests" src="https://img.shields.io/badge/tests-212%20unit%20%2B%208%20Detox-2EA44F" />
  <img alt="WCAG 2.1 AA" src="https://img.shields.io/badge/WCAG%202.1-AA-005A9C" />
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue" /></a>
</p>

<table align="center">
  <tr>
    <td align="center" width="25%"><img src="docs/media/screenshots/ios-account-light.png" width="200" alt="Account screen on iOS: current balance and the new transaction form" /></td>
    <td align="center" width="25%"><img src="docs/media/screenshots/ios-receipt-camera.png" width="200" alt="Receipt photo from the Nitro camera module, with the shared-memory details: 4.7 MB shared with JavaScript, no copy" /></td>
    <td align="center" width="25%"><img src="docs/media/screenshots/ios-refused-trace.png" width="200" alt="Refused debit with its Reference ID, and the request trace card with each server step" /></td>
    <td align="center" width="25%"><img src="docs/media/screenshots/ios-markets-fallback-dark.png" width="200" alt="Markets screen in dark mode: the market service is down, so the app shows saved prices and a Try again button" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Account</b><br />Balance, form, last 5</sub></td>
    <td align="center"><sub><b>Native receipt photo</b><br />Pixels shared, not copied</sub></td>
    <td align="center"><sub><b>Refused debit</b><br />Reference ID and server trace</sub></td>
    <td align="center"><sub><b>Market service down</b><br />Saved prices, dark theme</sub></td>
  </tr>
</table>

> All documents in this repository use ASD-STE100 Simplified Technical English. See [docs/STE-WRITING-RULES.md](docs/STE-WRITING-RULES.md).
>
> **Short on time?** The [Reviewer guide](docs/REVIEWER-GUIDE.md) is a 10-minute tour: where to look first, the trade-offs and the evidence.

## Contents

1. [Highlights](#highlights)
2. [Screenshots](#screenshots)
3. [Architecture](#architecture)
4. [Engineering decisions and trade-offs](#engineering-decisions-and-trade-offs)
5. [Quality gates](#quality-gates)
6. [Known limits and next steps](#known-limits-and-next-steps)
7. [Quick start](#quick-start)
8. [Reference](#reference): features, structure, setup, tests, HTTP API, accessibility, AI workflow, troubleshooting

## Highlights

Ledger records credits and debits, shows the balance and the last 5 transactions, and shows mock stock prices from a slow server that fails at random. The features are small on purpose. The engineering around them is the point.

| Area                        | What the code does                                                                                                                                                                                                | Read                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **One contract**            | One Zod schema gives the TypeScript types, the server validation, the client validation and the OpenAPI 3.1 document. CI fails when the document is old.                                                          | [ADR 0007](docs/adr/0007-zod-as-single-source-of-truth.md)                                  |
| **Correct money**           | All calculations use integer cents. The server refuses a negative balance and replays the ledger at start-up to check each balance.                                                                               | [ADR 0005](docs/adr/0005-money-in-integer-cents.md)                                         |
| **Safe retries**            | Each write has an idempotency key. A lost response, a retry or a second tap cannot record a debit two times, also after a server restart.                                                                         | [ADR 0011](docs/adr/0011-idempotency-key-for-writes.md)                                     |
| **Bad-network resilience**  | React Query retries with backoff, debounces the search and falls back to saved prices with a clear message. The mock server adds random delay and random failure.                                                 | [MarketsScreen](packages/features/src/markets/MarketsScreen.tsx)                            |
| **Native where it matters** | A Nitro module (Swift, Kotlin) decodes the receipt photo one time into native memory. JavaScript reads it as an `ArrayBuffer`: no copy, no base64. Measured: 4.7 MB shared, native decode 3 ms, JS analysis 2 ms. | [ADR 0008](docs/adr/0008-nitro-camera-zero-copy.md), [NATIVE-CAMERA](docs/NATIVE-CAMERA.md) |
| **End-to-end tracing**      | Each user action gets one W3C trace ID. The UI shows it as a Reference ID. Support uses it to find the server steps and the stored record.                                                                        | [ADR 0009](docs/adr/0009-w3c-trace-context.md), [TRACING](docs/TRACING.md)                  |
| **Accessible by default**   | WCAG 2.1 AA. Each component maps to VoiceOver, TalkBack and ARIA. Tests check the contrast of each color token pair in both themes. ESLint stops raw primitives in screens.                                       | [ACCESSIBILITY](docs/ACCESSIBILITY.md)                                                      |
| **One UI, three platforms** | iOS, Android and web use the same screens, the same Redux store and the same UI library (react-native-web). Only the platform services (camera, image picker) are platform code, behind an interface.             | [ADR 0006](docs/adr/0006-shared-ui-with-react-native-web.md)                                |
| **Failure containment**     | An error boundary for each tab and one for the app. The fallback shows a Reference ID. Error reports keep action types only, never form values or amounts.                                                        | [ADR 0012](docs/adr/0012-error-boundaries-and-error-reporting.md)                           |
| **AI with guardrails**      | An AI agent wrote code under rules ([CLAUDE.md](CLAUDE.md)), two project skills and automated gates. A person reviewed each change.                                                                               | [AI-WORKFLOW](docs/AI-WORKFLOW.md)                                                          |

<p align="center">
  <img src="docs/media/demo.gif" width="300" alt="Demo on the iOS simulator: take a receipt photo, record a debit, see a refused debit with its Reference ID and the request trace" />
</p>

## Screenshots

### iOS: light and dark themes

<table>
  <tr>
    <td align="center"><img src="docs/media/screenshots/ios-account-dark.png" width="220" alt="Account screen in dark mode" /></td>
    <td align="center"><img src="docs/media/screenshots/ios-history-dark.png" width="220" alt="Last 5 transactions in dark mode, with a receipt thumbnail, credit and debit badges" /></td>
    <td align="center"><img src="docs/media/screenshots/ios-markets-light.png" width="220" alt="Markets screen with live mock prices and the debounced stock search" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Account, dark theme</sub></td>
    <td align="center"><sub>Last 5 transactions, newest first</sub></td>
    <td align="center"><sub>Live prices, refresh every 30 seconds</sub></td>
  </tr>
</table>

### Web: the same screens, a two-column layout

<img src="docs/media/screenshots/web-account.png" alt="Web app at desktop width: balance and last 5 transactions on the left, new transaction form on the right" />

### Storybook and the API document

<table>
  <tr>
    <td width="50%"><img src="docs/media/screenshots/storybook.png" alt="Storybook: the Feedback component in four tones, with the axe-core accessibility panel showing 0 violations" /></td>
    <td width="50%"><img src="docs/media/screenshots/swagger.png" alt="Swagger UI for the Ledger mock API, generated from the Zod schemas" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Storybook with axe-core: 0 violations</sub></td>
    <td align="center"><sub>OpenAPI 3.1, generated from Zod</sub></td>
  </tr>
</table>

## Architecture

```mermaid
flowchart LR
  subgraph apps
    mobile["apps/mobile<br/>Expo, React Native"]
    web["apps/web<br/>Vite, react-native-web"]
    server["apps/server<br/>Express 5"]
  end
  subgraph packages
    contracts["@ledger/contracts<br/>Zod schemas, types, OpenAPI"]
    core["@ledger/core<br/>API client, Redux, React Query"]
    ui["@ledger/ui<br/>tokens, accessible components"]
    features["@ledger/features<br/>Account and Markets screens"]
    camera["@ledger/native-camera<br/>Nitro: Swift, Kotlin"]
  end
  mobile --> camera
  mobile --> features
  web --> features
  features --> core
  features --> ui
  core --> contracts
  server --> contracts
```

The rules that keep this structure:

- An app can use a package. A package cannot use an app.
- `core` does not import `react-native`, so its logic runs in plain Node.js tests.
- `ui` does not know about transactions or the API.
- Screens do not import native modules. They use the `PlatformServices` interface, and each app gives its implementation.
- Packages have no build step. Each package exports `src/index.ts`, so "go to definition" opens the real source.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for state ownership and the data flow.

## Engineering decisions and trade-offs

Each decision has an Architecture Decision Record (ADR) with the context, the alternatives and the consequences.

| Decision                                                              | Why                                                                                            | What it costs                                                           | ADR                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| pnpm monorepo, `apps/` and `packages/`, packages as TypeScript source | Three apps share one contract and one set of screens. Copies would become different over time. | Each bundler must compile workspace TypeScript.                         | [0001](docs/adr/0001-monorepo-apps-packages.md)               |
| pnpm `nodeLinker: hoisted`                                            | jest-expo, Detox and some native scripts find modules by a walk up the folder tree.            | Less strict dependency isolation.                                       | [0002](docs/adr/0002-pnpm-hoisted-node-linker.md)             |
| Redux Toolkit for account data, React Query for stock data            | Each data type has one owner. A write changes two views; quotes are server cache data.         | Two state tools to learn.                                               | [0003](docs/adr/0003-redux-toolkit-and-react-query.md)        |
| Only 200 and 500, with a closed list of `error.code` values           | The brief allows only these two statuses. The code carries the meaning.                        | Clients cannot use the HTTP status.                                     | [0004](docs/adr/0004-error-contract-200-500.md)               |
| Integer cents for all calculations                                    | `0.1 + 0.2` is not `0.3` in binary floating point.                                             | A conversion at each boundary.                                          | [0005](docs/adr/0005-money-in-integer-cents.md)               |
| One UI library for mobile and web with react-native-web               | One implementation, one set of tests, one Storybook.                                           | Web-only ARIA needs a small adapter (`webOnlyProps`).                   | [0006](docs/adr/0006-shared-ui-with-react-native-web.md)      |
| Zod as the single source of truth for the API                         | A hand-written OpenAPI document and the code become different.                                 | The OpenAPI document is generated, not written by hand.                 | [0007](docs/adr/0007-zod-as-single-source-of-truth.md)        |
| Nitro module with a shared `ArrayBuffer` for the receipt photo        | The usual base64 path copies the image several times and decodes it two times.                 | Swift and Kotlin code to maintain.                                      | [0008](docs/adr/0008-nitro-camera-zero-copy.md)               |
| W3C Trace Context from the thunk to the ledger file                   | Support must connect a user report to the server steps of that one action.                     | One header and one trace log.                                           | [0009](docs/adr/0009-w3c-trace-context.md)                    |
| Local JSON file behind a `LedgerRepository` interface                 | Data stays after a restart. Atomic writes and an integrity check at start-up.                  | One process only. A database replaces it in production.                 | [0010](docs/adr/0010-json-file-storage.md)                    |
| Idempotency key for each write                                        | A duplicate debit is a serious error. A mobile network can lose a response.                    | One more header and a key index on the server.                          | [0011](docs/adr/0011-idempotency-key-for-writes.md)           |
| Error boundaries and a pluggable error reporter without personal data | One render error must not stop the full app. Reports must not leak amounts or titles.          | No real crash service in the showcase (`setErrorReporter` is the hook). | [0012](docs/adr/0012-error-boundaries-and-error-reporting.md) |
| React Compiler on mobile and web, checked by `pnpm compiler:report`   | Manual memoization is easy to forget and easy to do incorrectly.                               | 4 functions had to change to compile.                                   | [0013](docs/adr/0013-react-compiler.md)                       |

## Quality gates

`pnpm verify` runs the first five gates. CI runs them on each push and pull request, and also builds Storybook and the web app. The Detox job runs on a macOS runner for each push to `main`.

| Gate                    | What it proves                                                                                         | Command                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------- |
| TypeScript, strict mode | All packages typecheck against the installed library types.                                            | `pnpm typecheck`       |
| ESLint                  | Includes a rule that stops raw `Text`, `Pressable` and `TextInput` in screens.                         | `pnpm lint`            |
| 212 unit tests          | Rules and screens, on 3 renderers: Node.js, react-native-web (DOM) and the React Native test renderer. | `pnpm test`            |
| OpenAPI check           | `apps/server/openapi.json` agrees with the Zod schemas.                                                | `pnpm openapi:check`   |
| React Compiler report   | The compiler compiles all 34 components. No bail-outs.                                                 | `pnpm compiler:report` |
| 8 Detox tests (iOS)     | The release build operates end to end, also the camera module and the trace of a refused debit.        | `pnpm e2e:test:ios`    |

Other evidence: the contrast test checks each text and background token pair in both themes; the idempotency test also runs after a server restart; the error-report test makes sure that a report has no form values. See the [Reviewer guide](docs/REVIEWER-GUIDE.md#4-evidence).

## Known limits and next steps

| Known limit                                                 | Next step                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| No authentication. There is one local account.              | OIDC with PKCE. Tokens in the Keychain and the Android Keystore.      |
| The data is a JSON file for one process.                    | A database behind the existing `LedgerRepository` interface.          |
| No offline mode.                                            | A persisted write queue. It sends with the existing idempotency keys. |
| No Android end-to-end tests. iOS Detox runs on `main` only. | Detox on Android, and iOS Detox on each pull request.                 |
| No real crash service.                                      | Connect Sentry or Crashlytics with `setErrorReporter`.                |
| No release pipeline.                                        | EAS build profiles and over-the-air updates with a staged rollout.    |

[docs/SECURITY-PRIVACY.md](docs/SECURITY-PRIVACY.md) gives the data inventory, the threats and the production checklist.

## Quick start

You need Node.js 22.12 or later and Corepack. The web app needs no Xcode.

```sh
corepack enable
pnpm install
pnpm dev:server   # terminal 1: API on http://localhost:4000, Swagger UI on /docs
pnpm dev:web      # terminal 2: web app on http://localhost:5173
pnpm verify       # typecheck, lint, 212 unit tests, OpenAPI check, React Compiler report
```

For the iOS and Android apps, Storybook and the Detox tests, read [Start the apps](#5-start-the-apps).

## Reference

The sections below are the full setup and reference material.

### 1. Feature map

| Requirement                                                                                  | Where                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Record one transaction (date/time, amount, type, description)                                | `packages/features/src/account/TransactionForm.tsx`                                                                                                                |
| Refuse a transaction that makes the balance negative                                         | `apps/server/src/domain/ledger.ts` (server rule), error shown in the form banner                                                                                   |
| Show the account balance                                                                     | `packages/features/src/account/BalanceCard.tsx`                                                                                                                    |
| Show the last 5 transactions                                                                 | `packages/features/src/account/RecentTransactions.tsx`                                                                                                             |
| HTTP API: read balance, read last 5, write one, only 200 or 500                              | `apps/server/src/app.ts`, [OpenAPI document](apps/server/openapi.json)                                                                                             |
| Title, description and image for expenses                                                    | `NewTransaction` schema in `packages/contracts/src/schemas.ts`                                                                                                     |
| Global state (Redux Toolkit)                                                                 | `packages/core/src/store/`                                                                                                                                         |
| Stock data with React Query (slow, fail, retry, debounce, fallback)                          | `packages/core/src/stocks/`, `packages/features/src/markets/MarketsScreen.tsx`                                                                                     |
| Shared UI library for web and mobile, with Storybook                                         | `packages/ui/`                                                                                                                                                     |
| OpenAPI document, validated with Zod                                                         | `packages/contracts/src/openapi.ts`, `apps/server/openapi.json`                                                                                                    |
| Unit tests and Detox tests                                                                   | `**/test/`, `apps/mobile/__tests__/`, `apps/mobile/e2e/`                                                                                                           |
| WCAG 2.1 AA (Section 504)                                                                    | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)                                                                                                                     |
| Two AI skills                                                                                | [.claude/skills/shared-ui-library](.claude/skills/shared-ui-library/SKILL.md), [.claude/skills/accessibility-review](.claude/skills/accessibility-review/SKILL.md) |
| Take a receipt photo with a native Nitro module; share pixels with JS through an ArrayBuffer | `packages/native-camera`, [docs/NATIVE-CAMERA.md](docs/NATIVE-CAMERA.md)                                                                                           |
| Trace one user request end to end (Reference ID)                                             | [docs/TRACING.md](docs/TRACING.md)                                                                                                                                 |
| Keep the data in a local JSON file, with showcase data                                       | `apps/server/data/`, [docs/DATA-STORAGE.md](docs/DATA-STORAGE.md)                                                                                                  |

### 2. Repository structure

The repository uses an `apps/` and `packages/` split.
An app can use a package. A package cannot use an app.

```text
apps/
  mobile/      Expo React Native app (iOS, Android). Jest tests and Detox tests.
  web/         React web app (Vite + react-native-web). Same screens as mobile.
  server/      Node.js mock API (Express 5, Zod, OpenAPI 3.1, Swagger UI).
packages/
  contracts/   Zod schemas, TypeScript types, OpenAPI document builder. Server and clients use it.
  core/        Platform-independent logic: API client, Redux store, React Query hooks, formatting.
  ui/          Design system: tokens, accessible components, Storybook.
  features/    Shared screens: Account, Markets. Mobile and web use them.
  native-camera/ Nitro native module (Swift, Kotlin): camera, shared pixel memory, PhotoView.
docs/          Plan, architecture, accessibility, decisions (ADR).
.claude/       AI skills and settings.
```

The dependency direction is: `contracts` → `core` → `features` ← `ui`. The apps use `features`.
Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full description.

### 3. Requirements

| Tool                        | Version                         | Necessary for                             |
| --------------------------- | ------------------------------- | ----------------------------------------- |
| Node.js                     | 22.12 or later (24 recommended) | All                                       |
| pnpm                        | 12 (`corepack enable`)          | All                                       |
| Xcode and an iOS simulator  | Xcode 26 or later               | iOS app, iOS Detox tests                  |
| Android Studio, an emulator | API 35 or later                 | Android app (no Android end-to-end tests) |
| applesimutils               | latest                          | iOS Detox tests only                      |

### 4. Install

1. Enable Corepack. This gives the correct pnpm version.

   ```sh
   corepack enable
   ```

2. Install the dependencies from the repository root.

   ```sh
   pnpm install
   ```

3. Make sure that the checks pass.

   ```sh
   pnpm verify
   ```

### 5. Start the apps

#### 5.1 Start the mock API

Start the API first. The web app and the mobile app use it.

```sh
pnpm dev:server
```

| URL                                | Content              |
| ---------------------------------- | -------------------- |
| http://localhost:4000/api/v1       | API                  |
| http://localhost:4000/docs         | Swagger UI           |
| http://localhost:4000/openapi.json | OpenAPI 3.1 document |

You can change the server behavior with environment variables:

| Variable               | Default                         | Effect                                                  |
| ---------------------- | ------------------------------- | ------------------------------------------------------- |
| `PORT`                 | `4000`                          | HTTP port                                               |
| `CHAOS_FAILURE_RATE`   | `0.3`                           | Probability (0 to 1) that a stock request fails         |
| `CHAOS_MIN_LATENCY_MS` | `150`                           | Minimum delay of a stock request                        |
| `CHAOS_MAX_LATENCY_MS` | `2500`                          | Maximum delay of a stock request                        |
| `INITIAL_BALANCE`      | `0`                             | Start balance in USD                                    |
| `LOG_REQUESTS`         | `true`                          | Write one log line for each request                     |
| `DATA_FILE`            | `apps/server/data/ledger.json`  | The ledger data file (JSON)                             |
| `SEED_ON_FIRST_START`  | `true`                          | Copy `data/seed.json` when the data file does not exist |
| `TRACE_FILE`           | `apps/server/data/traces.jsonl` | Request trace log (JSON Lines)                          |

Example: make every stock request fail, to see the fallback data.

```sh
CHAOS_FAILURE_RATE=1 pnpm dev:server
```

> NOTE: The server keeps the ledger in `apps/server/data/ledger.json`. At the first start it copies 13 showcase transactions from `data/seed.json`. To start again from the showcase data, run `pnpm --filter @ledger/server data:reset`. Read [docs/DATA-STORAGE.md](docs/DATA-STORAGE.md).

#### 5.2 Start the web app

```sh
pnpm dev:web
```

Open http://localhost:5173. To use a different API, set `VITE_API_URL`.

#### 5.3 Start the mobile app

The app uses native modules (the image picker and the Nitro camera module in `packages/native-camera`), so it needs a development build. Expo Go is not sufficient.

On the iOS simulator there is no camera. The "Take photo" button then gives a generated sample receipt, so you can see the native preview and the shared-memory details. On a device or on the Android emulator, the system camera opens.

1. Start the API (step 5.1).
2. Build and start the iOS app on a simulator.

   ```sh
   pnpm --filter @ledger/mobile ios
   ```

3. Or build and start the Android app on an emulator.

   ```sh
   pnpm --filter @ledger/mobile android
   ```

The app finds the API in this order:

1. The `EXPO_PUBLIC_API_URL` environment variable.
2. The host of the Metro server (for a physical device on the same network).
3. `http://localhost:4000` on iOS, `http://10.0.2.2:4000` on Android.

#### 5.4 Start Storybook

```sh
pnpm storybook
```

Open http://localhost:6006. Use the **Theme** toolbar to see the light and dark themes.
Use the **Accessibility** panel to see the axe-core results for each story.

### 6. Run the tests

Run all unit tests:

```sh
pnpm test
```

| Package                  | Runner                     | What the tests check                                                     |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------ |
| `packages/contracts`     | Vitest                     | Zod rules, money helpers, the OpenAPI document is valid                  |
| `apps/server`            | Vitest + Supertest         | Ledger rules, all endpoints, 200/500 contract, chaos, idempotency        |
| `packages/core`          | Vitest + Testing Library   | API client errors, Redux slices, safe write retries, error reports       |
| `packages/ui`            | Vitest + react-native-web  | Roles, names and states on the web; color contrast of all theme tokens   |
| `packages/features`      | Vitest + react-native-web  | Full Account flow: validation, credit, refused debit; error boundary     |
| `apps/mobile`            | Jest (jest-expo) + RNTL 14 | Native accessibility mapping (roles, states, hints) of the same screens  |
| `packages/native-camera` | Vitest                     | Pixel analysis on an RGBA ArrayBuffer (row padding, sampling, luminance) |

Other checks:

```sh
pnpm typecheck        # TypeScript in all packages
pnpm lint             # ESLint, including the "use @ledger/ui" rule
pnpm openapi:check    # apps/server/openapi.json agrees with the Zod schemas
pnpm compiler:report  # the React Compiler compiles all components (no bail-outs)
pnpm verify           # all of the above
```

### 7. Run the Detox end-to-end tests (iOS)

The Detox tests start the mock API themselves. The API uses no chaos and an empty ledger.

> CAUTION: Stop `pnpm dev:server` before you run the Detox tests. The tests need port 4000 and an empty ledger.

#### 7.1 iOS

1. Install applesimutils.

   ```sh
   brew tap wix/brew && brew install wix/brew/applesimutils
   ```

2. Build the release app. This step generates the `ios` folder and installs the pods.

   ```sh
   pnpm e2e:build:ios
   ```

3. Run the tests.

   ```sh
   pnpm e2e:test:ios
   ```

The configuration uses an "iPhone 17 Pro" simulator. To use a different simulator, change `devices.simulator` in `apps/mobile/.detoxrc.json`.

Last result: 8 of 8 tests passed on 2026-10-15 (iPhone 17 Pro, iOS 26.5, release build). See [docs/REVIEWER-GUIDE.md](docs/REVIEWER-GUIDE.md), section 4.1.

#### 7.2 Android

The Detox tests run on iOS only. The Android app builds and runs (`pnpm --filter @ledger/mobile android`), but the project has no Android end-to-end tests.

### 8. HTTP API

The [OpenAPI document](apps/server/openapi.json) is the reference. Swagger UI shows it at http://localhost:4000/docs.

| Method | Path                                 | Result                                         |
| ------ | ------------------------------------ | ---------------------------------------------- |
| GET    | `/api/v1/balance`                    | Current balance                                |
| GET    | `/api/v1/transactions?limit=5`       | Last transactions, newest first                |
| POST   | `/api/v1/transactions`               | Records one transaction, sends new balance     |
| GET    | `/api/v1/stocks/quotes?symbols=AAPL` | Mock quotes (random delay and failure)         |
| GET    | `/api/v1/stocks/search?q=app`        | Stock search (random delay and failure)        |
| GET    | `/api/v1/health`                     | Service status                                 |
| GET    | `/api/v1/traces/{traceId}`           | Server events of one user action (diagnostics) |

The assignment allows only "200 OK" and "500 Internal Server Error".
For this reason, every error uses status 500 and a body with a stable `error.code`:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "The transaction is refused. The balance cannot go below $0.00. Available balance: $20.00."
  }
}
```

| `error.code`             | Cause                                                              | Client retries?                                 |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------- |
| `INSUFFICIENT_FUNDS`     | The debit makes the balance less than 0                            | No                                              |
| `IDEMPOTENCY_KEY_REUSED` | The `idempotency-key` belongs to a transaction with different data | No                                              |
| `VALIDATION_FAILED`      | The request data is not correct (`details` has the fields)         | No                                              |
| `UPSTREAM_UNAVAILABLE`   | Random failure of the mock market service                          | Yes                                             |
| `INTERNAL_ERROR`         | Unexpected error                                                   | Yes (writes too, with the same idempotency key) |

Example request:

```sh
curl -X POST http://localhost:4000/api/v1/transactions \
  -H 'Content-Type: application/json' \
  -H 'idempotency-key: 6f1c2a3e-8b4d-4f0a-9c1e-2d3b4a5c6d7e' \
  -d '{"type":"credit","amount":120.50,"title":"Salary","description":"October"}'
```

Send the same command again. The server does not record a second transaction. It sends the first transaction and the header `idempotent-replayed: true`. Read [ADR 0011](docs/adr/0011-idempotency-key-for-writes.md).

### 9. Accessibility

The app follows WCAG 2.1 Level AA, as Section 504 of the Rehabilitation Act requires for patient-facing healthcare apps.
[docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) gives the conformance table and the manual test procedure for VoiceOver and TalkBack.

### 10. AI in the development process

[docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md) tells how we used an AI coding agent and how we control its output.
The repository includes the agent instructions ([CLAUDE.md](CLAUDE.md)) and two skills:

- `shared-ui-library`: rules to add or change a component in `packages/ui`.
- `accessibility-review`: a WCAG 2.1 AA review procedure for React Native screens.

### 11. Troubleshooting

| Problem                                                      | Cause                                                           | Action                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The mobile app shows "The app cannot connect to the server." | The API does not operate, or the device cannot reach it         | Start `pnpm dev:server`. On a physical device, set `EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:4000`. |
| Detox stops with "A server already uses port 4000."          | `pnpm dev:server` operates                                      | Stop the dev server. Then run the tests again.                                                          |
| The iOS build fails after a dependency change                | The generated `ios` folder is old                               | Run `pnpm --filter @ledger/mobile prebuild`. Then build again.                                          |
| The server stops with "The data file … is not valid"         | `ledger.json` was changed by hand, or its balances do not agree | Correct the file, or run `pnpm --filter @ledger/server data:reset`.                                     |
| The web app has no "Take photo" button                       | The web app has no native camera module                         | This is correct. Use "Add image".                                                                       |
| A user gives a Reference ID                                  | —                                                               | Follow the procedure in [docs/TRACING.md](docs/TRACING.md), section 6.                                  |
| pnpm shows "Ignored build scripts"                           | pnpm blocks unknown install scripts                             | Add the package to `allowBuilds` in `pnpm-workspace.yaml` only if it is necessary.                      |

## License

MIT. Read [LICENSE](LICENSE).
