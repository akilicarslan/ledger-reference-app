import type { Preview } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ThemeProvider, darkTheme, lightTheme, type ColorScheme } from '../src';

const preview: Preview = {
  globalTypes: {
    scheme: {
      description: 'Color scheme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { scheme: 'light' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    a11y: {
      // Fail the a11y check in the test runner and show violations in the panel.
      test: 'error',
      options: { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    },
  },
  decorators: [
    (Story, context) => {
      const scheme = (context.globals.scheme ?? 'light') as ColorScheme;
      const theme = scheme === 'dark' ? darkTheme : lightTheme;
      return (
        <ThemeProvider scheme={scheme}>
          <View
            style={{
              padding: 24,
              backgroundColor: theme.colors.canvas,
              minHeight: '100%',
              gap: 16,
            }}
          >
            <Story />
          </View>
        </ThemeProvider>
      );
    },
  ],
  tags: ['autodocs'],
};

export default preview;
