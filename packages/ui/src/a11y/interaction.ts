import type { PressableStateCallbackType, ViewStyle } from 'react-native';
import type { Theme } from '../theme/tokens';

/** react-native-web adds `focused` and `hovered` to the Pressable state. */
export type InteractionState = PressableStateCallbackType & {
  focused?: boolean;
  hovered?: boolean;
};

/**
 * Visible keyboard focus indicator for the web (WCAG 2.1 SC 2.4.7).
 * The outline color has 3:1 contrast or more against the surface.
 */
export function focusRing(theme: Theme, state: InteractionState): ViewStyle | null {
  if (!state.focused) return null;
  return {
    outlineColor: theme.colors.focus,
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineOffset: 2,
  };
}
