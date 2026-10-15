This is the Expo React Native app of the Ledger monorepo.

Read the root [CLAUDE.md](../../CLAUDE.md) first. It has the rules for the full repository.

## Rules for this app

1. Expo ships breaking changes in each SDK. Read the `expo` version in `package.json` (SDK 57). Use the versioned docs: `https://docs.expo.dev/versions/v57.0.0/`.
2. Use `npx expo install <package>` to add a dependency. It selects the SDK-compatible version.
3. The `ios/` and `android/` folders are generated (Continuous Native Generation). Do not edit them. Change `app.json` or a config plugin, then run `pnpm prebuild`.
4. The app has no router. `AppShell` from `@ledger/features` shows two tabs. Do not add Expo Router for this scope.
5. This app contains only the entry (`App.tsx`), the platform services (`src/platform.ts`) and the API URL (`src/config.ts`). Put screen code in `packages/features`.

## Commands

```sh
pnpm --filter @ledger/mobile ios            # development build on the iOS simulator
pnpm --filter @ledger/mobile android        # development build on the Android emulator
pnpm --filter @ledger/mobile test           # jest-expo tests (native renderer)
pnpm --filter @ledger/mobile typecheck
pnpm e2e:build:ios && pnpm e2e:test:ios     # Detox, iOS only (stop pnpm dev:server first)
```
