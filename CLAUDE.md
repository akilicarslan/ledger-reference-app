# Instructions for AI agents

This file gives the rules for an AI coding agent (Claude Code or a similar tool) in this repository.
Read it before you change code. Write all text in ASD-STE100 (see `docs/STE-WRITING-RULES.md`).

## Repository

- pnpm monorepo. `apps/` has runnable apps. `packages/` has libraries. Read `docs/ARCHITECTURE.md`.
- All code is TypeScript in strict mode. Do not add JavaScript source files.
- Packages have no build step. They export `src/index.ts`.
- Expo SDK 57, React Native 0.86 (New Architecture), React 19.2. Use `npx expo install <package>` in `apps/mobile` for native modules.

## Commands

```sh
pnpm install
pnpm verify            # typecheck + lint + unit tests + OpenAPI check
pnpm dev:server        # API on http://localhost:4000 (Swagger UI on /docs)
pnpm dev:web           # web app on http://localhost:5173
pnpm storybook         # UI library on http://localhost:6006
pnpm openapi:generate  # after a change to packages/contracts
```

Run `pnpm verify` before you say that a task is complete.

## Rules

1. **API contract.** Change the API only in `packages/contracts/src/schemas.ts` and `openapi.ts`. Then run `pnpm openapi:generate`. Do not edit `apps/server/openapi.json` by hand.
2. **Errors.** The API sends only 200 or 500. Each error has an `error.code` from `ErrorCode`. See `docs/adr/0004-error-contract-200-500.md`.
3. **Money.** Calculate in integer cents (`toCents`, `fromCents`). Do not add or subtract decimal amounts.
4. **State.** Account data and form values go in Redux Toolkit (`packages/core/src/store`). Stock data goes in React Query (`packages/core/src/stocks`). Do not keep the same data in both.
5. **UI.** Screens use components from `@ledger/ui`. ESLint stops raw `Text`, `Pressable` and `TextInput` in screens. To add a component, use the `shared-ui-library` skill.
6. **Accessibility.** Every UI change must keep WCAG 2.1 AA. Use the `accessibility-review` skill after a UI change.
7. **Platform code.** A screen does not import a native module. Add a method to `PlatformServices` and implement it in each app.
8. **Tests.** Add a test for each behavior change. Query UI by role and accessible name. Use `TestIds` from `@ledger/features/testIds` for Detox.
9. **Text.** UI messages tell what happened and what to do. Use STE.
10. **Native module.** Change the camera API only in `packages/native-camera/src/specs/*.nitro.ts`, then run `pnpm --filter @ledger/native-camera codegen`. Do not edit `nitrogen/generated`. Read `docs/NATIVE-CAMERA.md`.
11. **Tracing.** Each user action gets one trace ID in its thunk; pass it as `{ traceId }` to the API client. Each server step that changes or refuses data must call `trace.event(...)`. Read `docs/TRACING.md`.
12. **Data file.** The server data is `apps/server/data/ledger.json`. Change the seed only with `scripts/data.ts`, so the balances stay correct.

## Skills

| Skill                                 | Use it when                                         |
| ------------------------------------- | --------------------------------------------------- |
| `.claude/skills/shared-ui-library`    | You add or change a component in `packages/ui`.     |
| `.claude/skills/accessibility-review` | You review a screen or a component for WCAG 2.1 AA. |
