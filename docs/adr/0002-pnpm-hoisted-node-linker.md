# ADR 0002: pnpm `nodeLinker: hoisted`

- Status: Accepted
- Date: 2026-10-13

## Context

pnpm uses an isolated `node_modules` layout by default. Expo supports this layout from SDK 54.
Some tools in this repository find React Native modules by a walk up the folder tree: jest-expo, Detox, the Storybook react-native-web framework and some Gradle and CocoaPods scripts.
These tools are more reliable with a flat `node_modules` folder.

## Decision

Set `nodeLinker: hoisted` in `pnpm-workspace.yaml`. The Expo monorepo guide gives this setting as the fallback for SDK 54 and later.

## Consequences

- All tools find one copy of each package in the root `node_modules`.
- A package can import a dependency that it does not declare ("phantom dependency"). ESLint and the typecheck of each package reduce this risk, but do not remove it.
- If all tools support isolated installs in the future, remove the setting.
