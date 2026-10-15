import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest config for packages that render React Native components.
 * Tests run in jsdom with react-native-web, the same renderer as the web app
 * and Storybook. Native rendering is covered by jest-expo tests in
 * apps/mobile and by the Detox end-to-end tests.
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.mjs', '.js', '.json'],
  },
  define: {
    __DEV__: 'true',
  },
  test: {
    environment: 'jsdom',
  },
});
