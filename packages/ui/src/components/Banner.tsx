import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ColorTokens, Theme } from '../theme/tokens';
import { Button } from './Button';
import { Text, type TextTone } from './Text';

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<
  BannerTone,
  {
    icon: string;
    title: string;
    text: TextTone;
    surface: keyof ColorTokens;
    border: keyof ColorTokens;
  }
> = {
  info: {
    icon: 'ℹ',
    title: 'Information',
    text: 'info',
    surface: 'infoSurface',
    border: 'infoText',
  },
  success: {
    icon: '✓',
    title: 'Success',
    text: 'success',
    surface: 'successSurface',
    border: 'successText',
  },
  warning: {
    icon: '!',
    title: 'Warning',
    text: 'warning',
    surface: 'warningSurface',
    border: 'warningText',
  },
  error: {
    icon: '⚠',
    title: 'Error',
    text: 'danger',
    surface: 'dangerSurface',
    border: 'dangerText',
  },
};

export interface BannerProps {
  tone: BannerTone;
  message: string;
  /** Visible title. The default is the tone name ("Error"), so the meaning does not depend on color. */
  title?: string;
  action?: { label: string; onPress: () => void; testID?: string };
  /**
   * Support reference, for example the trace ID of the failed request. The
   * text is selectable, so the user can copy it into a support request.
   */
  reference?: string;
  testID?: string;
}

/**
 * Inline message. To announce it, put it in a <LiveRegion>; the Banner
 * itself does not speak.
 */
export function Banner({ tone, message, title, action, reference, testID }: BannerProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const config = TONES[tone];

  return (
    <View
      testID={testID}
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors[config.surface],
          borderLeftColor: theme.colors[config.border],
        },
      ]}
    >
      <View style={styles.body}>
        <Text aria-hidden variant="bodyStrong" tone={config.text} style={styles.icon}>
          {config.icon}
        </Text>
        <View style={styles.textColumn}>
          <Text variant="bodyStrong" tone={config.text}>
            {title ?? config.title}
          </Text>
          <Text variant="body" tone={config.text} testID={testID ? `${testID}-message` : undefined}>
            {message}
          </Text>
          {reference ? (
            <Text
              variant="caption"
              tone={config.text}
              selectable
              style={styles.reference}
              testID={testID ? `${testID}-reference` : undefined}
            >
              {`Reference ID: ${reference}`}
            </Text>
          ) : null}
        </View>
      </View>
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          testID={action.testID}
        />
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      borderRadius: theme.radii.md,
      borderLeftWidth: 4,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    body: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
    icon: { width: 20, textAlign: 'center' },
    textColumn: { flex: 1, gap: theme.spacing.xxs },
    reference: { fontVariant: ['tabular-nums'] },
  });
