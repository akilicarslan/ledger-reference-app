import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Semantic mapping notes (read with docs/ACCESSIBILITY.md):
 *
 * | Need               | iOS (VoiceOver)                    | Android (TalkBack)            | Web (react-native-web)  |
 * |--------------------|------------------------------------|-------------------------------|-------------------------|
 * | Name               | accessibilityLabel                 | accessibilityLabel            | aria-label              |
 * | Role               | role → UIAccessibilityTraits       | role → className/roleDesc     | role                    |
 * | State              | aria-checked/selected/disabled/busy| same                          | same aria-* attributes  |
 * | Hint / description | accessibilityHint                  | accessibilityHint             | aria-describedby        |
 * | Status message     | announceForAccessibility (no live) | aria-live (live region)       | aria-live               |
 *
 * React Native has no `aria-describedby` or `aria-invalid` for native
 * platforms. We send the error text in `accessibilityHint` on iOS and
 * Android, and in `aria-describedby` / `aria-invalid` on the web.
 */

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';

/**
 * Props that only react-native-web understands (for example
 * `aria-describedby`). On iOS and Android this returns an empty object.
 * The return type is `object`, so it does not change the component props type.
 */
export function webOnlyProps(props: Record<string, unknown>): object {
  return isWeb ? props : {};
}

/**
 * Speaks a status message on iOS. iOS does not support live regions, so
 * VoiceOver must get the message from this API. On Android and on the web,
 * use <LiveRegion>: TalkBack and browsers read changes in a live region.
 */
export function announceOnIOS(message: string, options: { queue?: boolean } = {}): void {
  if (!isIOS || !message) return;
  AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: options.queue ?? true });
}
