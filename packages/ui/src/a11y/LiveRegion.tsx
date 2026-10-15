import { useEffect, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { announceOnIOS, webOnlyProps } from './platform';

export interface LiveRegionProps {
  /**
   * Text that assistive technology must speak when it changes. Send the same
   * text that the children show. An empty value speaks nothing.
   */
  message: string | null | undefined;
  /** `assertive` interrupts the user. Use it only for errors. */
  politeness?: 'polite' | 'assertive';
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Status message container (WCAG 2.1 SC 4.1.3).
 *
 * Keep this component mounted all the time and change only its content.
 * Android TalkBack and browsers read a live region only when its content
 * changes. iOS has no live regions, so the component also calls
 * `announceForAccessibility` on iOS.
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  children,
  style,
  testID,
}: LiveRegionProps) {
  useEffect(() => {
    if (message) announceOnIOS(message, { queue: politeness === 'polite' });
  }, [message, politeness]);

  return (
    <View
      aria-live={politeness}
      style={style}
      testID={testID}
      {...webOnlyProps({
        'aria-atomic': true,
        role: politeness === 'assertive' ? 'alert' : 'status',
      })}
    >
      {children}
    </View>
  );
}
