# ADR 0006: One UI library for mobile and web with react-native-web

- Status: Accepted
- Date: 2026-10-13

## Context

The assignment asks for a simple UI library that the React web app and the React Native app share.
There are two common methods:

1. Write the components with React Native primitives. Render them on the web with react-native-web.
2. Write two implementations (DOM and native) behind one API.

## Decision

Use method 1. `@ledger/ui` uses only React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `Image`).
The web app and Storybook alias `react-native` to `react-native-web`.
Web-only ARIA attributes go through `webOnlyProps()`. iOS-only behavior goes through `announceOnIOS()`.

## Consequences

- One implementation, one set of stories, one set of tests for each component.
- The screens in `@ledger/features` are also shared. The web app has only an entry file and a file picker.
- react-native-web does not support all native props. Tests run on both renderers: Vitest with react-native-web, and Jest with the native renderer.
- The web bundle includes react-native-web (about 180 kB gzip for the full app). This is acceptable for an internal tool.
