import type { StorybookConfig } from '@storybook/react-native-web-vite';

/**
 * Storybook renders the React Native components in the browser with
 * react-native-web, the same renderer as apps/web. The a11y addon runs axe-core
 * on each story. Open the "Accessibility" panel to see the results.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;
