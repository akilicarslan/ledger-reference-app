import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../a11y/useReducedMotion';
import { useTheme } from '../theme/ThemeProvider';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder shape while data loads. It is decorative and hidden from
 * screen readers; show a text status (for example "Loading balance") near it.
 * The pulse animation stops when the user turns on "Reduce motion".
 */
export function Skeleton({ width = '100%', height = 16, style }: SkeletonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  // useState keeps one Animated.Value for the life of the component.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      aria-hidden
      style={[
        {
          width,
          height,
          borderRadius: theme.radii.sm,
          backgroundColor: theme.colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}
