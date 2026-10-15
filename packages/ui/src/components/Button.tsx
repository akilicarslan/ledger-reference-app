import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { focusRing, type InteractionState } from '../a11y/interaction';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  /** Visible text. It is also the accessible name (WCAG 2.1 SC 2.5.3 "Label in Name"). */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner, sets `aria-busy` and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Tells what happens after the press, when the label does not. Spoken after the label. */
  accessibilityHint?: string;
  /** Decorative symbol before the label. Screen readers do not read it. */
  icon?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
  icon,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const inactive = disabled || loading;
  const palette = variantPalette(theme, variant);

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={inactive}
      aria-busy={loading}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      style={(state: InteractionState) => [
        styles.base,
        {
          backgroundColor: state.pressed ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
        focusRing(theme, state),
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.foreground} aria-hidden />
        ) : icon ? (
          <Text aria-hidden variant="bodyStrong" style={{ color: palette.foreground }}>
            {icon}
          </Text>
        ) : null}
        <Text
          variant="bodyStrong"
          style={{ color: palette.foreground }}
          numberOfLines={2}
          align="center"
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function variantPalette(theme: Theme, variant: ButtonVariant) {
  const { colors } = theme;
  switch (variant) {
    case 'primary':
      return {
        background: colors.primary,
        pressed: colors.primaryPressed,
        foreground: colors.onPrimary,
        border: colors.primary,
      };
    case 'danger':
      return {
        background: colors.danger,
        pressed: colors.dangerPressed,
        foreground: colors.onDanger,
        border: colors.danger,
      };
    case 'secondary':
      return {
        background: colors.surface,
        pressed: colors.surfaceMuted,
        foreground: colors.primary,
        border: colors.borderStrong,
      };
    case 'ghost':
      return {
        background: 'transparent',
        pressed: colors.surfaceMuted,
        foreground: colors.primary,
        border: 'transparent',
      };
  }
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: theme.minTouchTarget,
      minWidth: theme.minTouchTarget,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    fullWidth: { alignSelf: 'stretch' },
    inactive: { opacity: 0.55 },
  });
