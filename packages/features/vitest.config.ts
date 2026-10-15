import { mergeConfig } from 'vitest/config';
import shared from '../../vitest.react-native-web.ts';

export default mergeConfig(shared, {
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
