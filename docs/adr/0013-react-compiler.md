# ADR 0013: React Compiler

- Status: Accepted
- Date: 2026-10-15

## Context

Manual memoization (`useMemo`, `useCallback`, `React.memo`) is easy to forget and easy to do incorrectly. A missing memo gives unnecessary renders. A wrong dependency list gives stale data. The React Compiler 1.0 adds memoization automatically at build time.

## Decision

1. Enable the React Compiler in both apps:
   - mobile: `"experiments": { "reactCompiler": true }` in `apps/mobile/app.json` (babel-preset-expo runs the compiler on app code and on the workspace packages);
   - web: `reactCompilerPreset()` with `@rolldown/plugin-babel` in `apps/web/vite.config.ts`.
2. Keep the compiler rules of `eslint-plugin-react-hooks` 7 (`recommended`) on. They find code that the compiler cannot compile safely.
3. Add `pnpm compiler:report` (`scripts/react-compiler-report.ts`). It runs the compiler on each `.tsx` file and lists the components that it compiles, skips or cannot compile. `pnpm verify` runs it and fails when a component cannot compile.

## Result

The first report found 4 functions in 3 files that the compiler could not compile:

| File                  | Cause                                             | Change                                                                      |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `TransactionForm.tsx` | `try … finally` (2 functions)                     | Move the work into a helper; call `setPicking(false)` after the `try/catch` |
| `TextField.tsx`       | A ternary inside `\|\|` in the render body        | Use a small `joinPresent()` helper                                          |
| `ThemeProvider.tsx`   | An `eslint-disable` comment for `exhaustive-deps` | Add the stable `factory` to the dependency list                             |

After the changes: 34 components and hooks compile, 0 fail.

## Alternatives

- **Manual memoization only.** It is possible, but each new component needs a review for it.
- **Compiler in `annotation` mode ("use memo" on each component).** This is safer for a large old code base. This code base is small and new, so the full mode is correct.

## Consequences

- New code does not need `useMemo` or `useCallback` for performance. Existing hooks stay; the compiler accepts them.
- Class components (only `ErrorBoundary`) are not compiled.
- A future change that breaks a compiler rule fails `pnpm verify`. The report shows the file and the cause.
