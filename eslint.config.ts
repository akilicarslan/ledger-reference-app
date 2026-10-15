import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Accessibility rule for the architecture: screens must use the accessible
 * components from @ledger/ui, not the raw React Native primitives.
 * Only packages/ui can use the primitives.
 */
const RAW_INTERACTIVE_PRIMITIVES = [
  'Text',
  'TextInput',
  'Pressable',
  'Button',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'Switch',
];

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/storybook-static/**',
      '**/coverage/**',
      'apps/mobile/ios/**',
      'apps/mobile/android/**',
      'apps/mobile/.expo/**',
      'packages/native-camera/android/**',
      'packages/native-camera/nitrogen/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, __DEV__: 'readonly' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: [
      'packages/features/src/**/*.{ts,tsx}',
      'apps/mobile/**/*.{ts,tsx}',
      'apps/web/src/**/*.{ts,tsx}',
    ],
    ignores: ['**/__tests__/**', '**/e2e/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: RAW_INTERACTIVE_PRIMITIVES,
              message:
                'Use the accessible component from @ledger/ui (see .claude/skills/shared-ui-library).',
            },
          ],
        },
      ],
    },
  },
  {
    // Command-line scripts and the server log to the console on purpose.
    files: ['apps/server/**/*.ts', 'apps/mobile/e2e/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/test/**/*.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/e2e/**/*.ts',
    ],
    languageOptions: { globals: { ...globals.jest } },
  },
);
