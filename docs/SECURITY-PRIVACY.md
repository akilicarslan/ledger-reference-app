# Security and privacy

This document tells which data the app keeps, how the app protects it now, and what a production version must change.

> WARNING: Ledger is a local showcase. It has no user accounts, and the server keeps the data in a JSON file without encryption. Do not put real financial or health data into it.

## Contents

1. [Scope](#1-scope)
2. [Data inventory](#2-data-inventory)
3. [Controls in the code now](#3-controls-in-the-code-now)
4. [Threats and the production changes](#4-threats-and-the-production-changes)
5. [Privacy rules for developers](#5-privacy-rules-for-developers)
6. [Production checklist](#6-production-checklist)

## 1. Scope

| In scope                                                     | Not in scope                             |
| ------------------------------------------------------------ | ---------------------------------------- |
| The mobile app, the web app and the mock API on one computer | Hosting, network infrastructure, backups |
| Data at rest in `apps/server/data/`                          | Legal review (for example HIPAA, GDPR)   |
| Data in memory on the device                                 | Penetration test                         |

## 2. Data inventory

| Data                                            | Where it is kept                                      | Protection now                                                                 | Production change                                                                               |
| ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Transactions (title, description, amount, date) | `apps/server/data/ledger.json`                        | Zod validation at each read, integrity check at start-up, atomic write         | Database with encryption at rest, access control for each user, backups                         |
| Receipt images                                  | In `ledger.json` as base64 data URIs                  | Type check (PNG, JPEG, WebP), size limit (1.5 MB of text)                      | Object storage with short-lived signed URLs; remove image metadata on the server                |
| Request traces                                  | `apps/server/data/traces.jsonl`, server memory (5000) | No titles, no descriptions, no images. Amounts and balances are in some events | Remove amounts and balances from events; set a retention period (for example 30 days)           |
| Error reports                                   | Console (one JSON line)                               | No form values and no action payloads (test: `errorReporting.test.ts`)         | Send to a crash-reporting service with data scrubbing on                                        |
| Account state and form values on the device     | Redux, in memory only                                 | Nothing is written to device storage                                           | Keep this rule. If offline storage is added, encrypt it (iOS Data Protection, Android Keystore) |
| Camera pixels                                   | Native memory shared with JavaScript (`ArrayBuffer`)  | Released after a successful submit or "Remove image"                           | Keep this rule                                                                                  |
| Idempotency keys, trace IDs                     | On each transaction                                   | Random values; they contain no personal data                                   | No change                                                                                       |

### 2.1 Image metadata

- The **camera** path (Nitro module) encodes the JPEG from raw pixels. iOS writes only basic EXIF fields: orientation, resolution and pixel size. We decoded a stored photo: it has no GPS tag, so it has no location.
- The **photo library** path uses `expo-image-picker` without `exif: true` and encodes the result again as JPEG (quality 0.4). We did not do a check that each platform removes all metadata in this path. A production server must remove all image metadata before it stores the image.

## 3. Controls in the code now

| Control                             | Where                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Input validation on the server      | Zod schemas in `packages/contracts`; the server parses every body and query                                           |
| Input validation on the client      | The same schemas; the client also validates every response                                                            |
| Request size limit                  | `express.json({ limit: '2mb' })` in `apps/server/src/app.ts`                                                          |
| Money without rounding errors       | Integer cents ([ADR 0005](adr/0005-money-in-integer-cents.md))                                                        |
| No negative balance                 | Server rule in `Ledger.record`; the client cannot skip it                                                             |
| No duplicate writes on retry        | Idempotency key ([ADR 0011](adr/0011-idempotency-key-for-writes.md))                                                  |
| Data file integrity                 | Replay of all balances at start-up ([ADR 0010](adr/0010-json-file-storage.md))                                        |
| No internal details in errors       | `toErrorBody` sends a stable code and a safe message; the stack goes only to the server log                           |
| HTTP only to the local network      | iOS App Transport Security: `NSAllowsArbitraryLoads: false`, `NSAllowsLocalNetworking: true` (`apps/mobile/app.json`) |
| No `x-powered-by` header            | `app.disable('x-powered-by')`                                                                                         |
| Error reports without personal data | Breadcrumbs keep only action types ([ADR 0012](adr/0012-error-boundaries-and-error-reporting.md))                     |

## 4. Threats and the production changes

| Threat                                                 | Status now                                    | Production change                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A person reads the network traffic                     | HTTP on localhost only                        | TLS 1.2 or later for all traffic. Remove `NSAllowsLocalNetworking`. Think about certificate pinning                                            |
| A person uses the API without permission               | No authentication (one local account)         | OAuth 2.0 / OpenID Connect with PKCE (`expo-auth-session`). Keep tokens in the Keychain or Keystore (`expo-secure-store`). Short access tokens |
| A user reads or changes the ledger of a different user | Not possible: there is one ledger             | Authorization check on each request; the ledger ID comes from the token, not from the request body                                             |
| A website calls the API from a browser                 | CORS allows all origins (development only)    | Allow only the web app origin                                                                                                                  |
| Too many requests                                      | No limit                                      | Rate limit for each user and each IP address                                                                                                   |
| A person sees the balance in the app switcher          | The app switcher shows the last screen        | Show a privacy cover when the app goes inactive (`AppState`), or use `expo-screen-capture`                                                     |
| A person picks up an unlocked phone                    | No app lock                                   | Optional biometric lock (`expo-local-authentication`) after a time in the background                                                           |
| The data file is changed by hand                       | The server refuses to start (integrity check) | Database constraints and an audit log                                                                                                          |
| A log or crash report contains personal data           | Traces have amounts; error reports have none  | Remove amounts from traces; turn on data scrubbing in the crash-reporting service                                                              |
| A dependency has a known vulnerability                 | No automatic check                            | `pnpm audit` and Dependabot or Renovate in CI                                                                                                  |

## 5. Privacy rules for developers

1. Do not log a title, a description, a receipt image or a token. Log IDs (transaction ID, trace ID).
2. Do not put a Redux action payload into a breadcrumb or an error report.
3. Do not write account data to device storage without encryption.
4. Release native image memory when the user does not need the image (see [NATIVE-CAMERA.md](NATIVE-CAMERA.md)).
5. A new trace event must not contain free text from the user. Add a test when you add an event with new attributes.

## 6. Production checklist

- [ ] TLS for all traffic; no ATS exceptions.
- [ ] Authentication (OIDC with PKCE) and an authorization check on each request.
- [ ] Database with encryption at rest; receipt images in object storage; image metadata removed on the server.
- [ ] Rate limits, CORS for known origins only.
- [ ] No amounts in traces; a retention period for traces and logs.
- [ ] Crash-reporting service behind `setErrorReporter`, with data scrubbing.
- [ ] Privacy cover in the app switcher; optional biometric lock.
- [ ] Dependency audit in CI.
