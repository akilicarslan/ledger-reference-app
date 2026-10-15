import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Text } from './Text';

export interface ListProps {
  /** Accessible name of the list, for example "Last 5 transactions". */
  accessibilityLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function List({ accessibilityLabel, children, style, testID }: ListProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      role="list"
      accessibilityLabel={accessibilityLabel}
      style={[styles.list, style]}
      testID={testID}
    >
      {children}
    </View>
  );
}

export interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Element on the left, for example an image or a badge. */
  leading?: ReactNode;
  /** Text on the right, for example an amount. */
  trailing?: ReactNode;
  /**
   * One sentence that screen readers speak for the full row. The row is
   * one accessible element, so the user does not swipe through each part.
   */
  accessibilityLabel: string;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  accessibilityLabel,
  testID,
}: ListItemProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      role="listitem"
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.item}
      testID={testID}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSubtle,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: theme.minTouchTarget,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSubtle,
    },
    leading: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: theme.spacing.xxs },
    trailing: { alignItems: 'flex-end', gap: theme.spacing.xxs, flexShrink: 0, maxWidth: '45%' },
  });
