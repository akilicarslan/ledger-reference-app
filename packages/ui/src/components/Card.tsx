import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { webOnlyProps } from '../a11y/platform';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Text } from './Text';

export interface CardProps {
  /** Section heading. Screen readers can jump to it. */
  title?: string;
  subtitle?: string;
  /** Element on the right side of the heading, for example a button. */
  headerAction?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Surface for one section of a screen. On the web it is a named `region` landmark. */
export function Card({ title, subtitle, headerAction, children, style, testID }: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={[styles.card, style]}
      testID={testID}
      {...(title ? webOnlyProps({ role: 'region', 'aria-label': title }) : {})}
    >
      {title || headerAction ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <Text variant="heading" headingLevel={2}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="caption" tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerAction}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSubtle,
      borderWidth: 1,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    headerText: { flexShrink: 1, flexGrow: 1, gap: theme.spacing.xxs },
  });
