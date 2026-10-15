// Detox ships no type declarations for its Jest runner hooks.
declare module 'detox/runners/jest/globalSetup' {
  export default function globalSetup(
    globalConfig?: unknown,
    projectConfig?: unknown,
  ): Promise<void>;
}

declare module 'detox/runners/jest/globalTeardown' {
  export default function globalTeardown(
    globalConfig?: unknown,
    projectConfig?: unknown,
  ): Promise<void>;
}
