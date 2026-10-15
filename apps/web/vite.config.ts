import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * react-native-web setup:
 * - `react-native` imports go to `react-native-web`.
 * - `.web.tsx` files win over `.tsx` files, the same rule as Metro.
 * The shared packages are TypeScript source; Vite compiles them directly.
 *
 * React Compiler: the same automatic memoization as the mobile app
 * (`experiments.reactCompiler` in apps/mobile/app.json). See docs/adr/0011.
 */
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.mjs', '.js', '.jsx', '.json'],
  },
  define: {
    // react-native-web (Animated) reads the Node.js `global` object.
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
