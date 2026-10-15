import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ColorTokens, Theme } from '../theme/tokens';
import { Text, type TextTone } from './Text';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, { surface: keyof ColorTokens; text: TextTone }> = {
  neutral: { surface: 'surfaceMuted', text: 'muted' },
  info: { surface: 'infoSurface', text: 'info' },
  success: { surface: 'successSurface', text: 'success' },
  warning: { surface: 'warningSurface', text: 'warning' },
  danger: { surface: 'dangerSurface', text: 'danger' },
};

export interface BadgeProps {
  /** The text tells the meaning. The color only supports it (WCAG 2.1 SC 1.4.1). */
  label: string;
  tone?: BadgeTone;
  testID?: string;
}

export function Badge({ label, tone = 'neutral', testID }: BadgeProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor: theme.colors[TONES[tone].surface] }]}
    >
      <Text variant="caption" tone={TONES[tone].text} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
    },
    text: { fontWeight: '600' },
  });
