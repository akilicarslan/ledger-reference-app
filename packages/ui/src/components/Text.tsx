import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { webOnlyProps } from '../a11y/platform';
import { useTheme } from '../theme/ThemeProvider';
import type { ColorTokens, TypographyVariant } from '../theme/tokens';

export type TextTone =
  'default' | 'muted' | 'primary' | 'onPrimary' | 'success' | 'danger' | 'warning' | 'info';

const TONE_TO_COLOR: Record<TextTone, keyof ColorTokens> = {
  default: 'text',
  muted: 'textMuted',
  primary: 'primary',
  onPrimary: 'onPrimary',
  success: 'successText',
  danger: 'dangerText',
  warning: 'warningText',
  info: 'infoText',
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  /**
   * Makes the text a heading. Screen readers can jump between headings
   * (WCAG 2.1 SC 1.3.1 and 2.4.6). On the web, the level becomes aria-level.
   */
  headingLevel?: 1 | 2 | 3 | 4;
  /** Uses digits of equal width. Use it for amounts in columns. */
  tabular?: boolean;
  align?: 'auto' | 'left' | 'right' | 'center';
}

export function Text({
  variant = 'body',
  tone = 'default',
  headingLevel,
  tabular = false,
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      role={headingLevel ? 'heading' : undefined}
      {...(headingLevel ? webOnlyProps({ 'aria-level': headingLevel }) : {})}
      style={[
        theme.typography[variant],
        { color: theme.colors[TONE_TO_COLOR[tone]] },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
