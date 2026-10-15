import { forwardRef, useId, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { webOnlyProps } from '../a11y/platform';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Text } from './Text';

/** Ref type of TextField. Use it to move focus, for example to the first field with an error. */
export type TextFieldRef = TextInput;

export interface TextFieldProps extends Omit<
  TextInputProps,
  'style' | 'accessibilityLabel' | 'accessibilityHint' | 'placeholderTextColor'
> {
  /** Visible label. It is also the accessible name of the input. */
  label: string;
  /** Help text below the label, for example the expected format (WCAG 2.1 SC 3.3.2). */
  hint?: string;
  /** Error text. The field shows it in text, not only in color (SC 1.4.1 and 3.3.1). */
  error?: string | null;
  required?: boolean;
}

/**
 * Text input with a visible label, a hint and an error message.
 *
 * Accessibility mapping:
 * - iOS / Android: accessibilityLabel = label (+ "required"), accessibilityHint = error + hint.
 * - Web: aria-label, aria-required, aria-invalid and aria-describedby (hint and error ids).
 * The visible label is hidden from screen readers, so they do not read it two times.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, required = false, multiline, onFocus, onBlur, testID, ...inputProps },
  ref,
) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const baseId = useId().replace(/:/g, '');
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;

  const nativeHint = joinPresent([error ? `Error: ${error}` : null, hint], '. ');
  const describedBy = joinPresent([error ? errorId : null, hint ? hintId : null], ' ');

  return (
    <View style={styles.container}>
      <View style={styles.labelRow} aria-hidden>
        <Text variant="label">{label}</Text>
        {required ? (
          <Text variant="caption" tone="muted">
            (required)
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text variant="caption" tone="muted" nativeID={hintId} aria-hidden>
          {hint}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        testID={testID}
        accessibilityLabel={required ? `${label}, required` : label}
        accessibilityHint={nativeHint}
        {...webOnlyProps({
          'aria-required': required,
          'aria-invalid': Boolean(error),
          'aria-describedby': describedBy,
        })}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
        {...inputProps}
      />
      {error ? (
        <View
          style={styles.errorRow}
          nativeID={errorId}
          testID={testID ? `${testID}-error` : undefined}
        >
          <Text aria-hidden variant="label" tone="danger">
            ⚠
          </Text>
          <Text variant="label" tone="danger" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

/** Joins the parts that have a value. Returns undefined when no part has a value. */
function joinPresent(parts: readonly (string | null | undefined)[], separator: string) {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(separator) : undefined;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.xs,
      flexWrap: 'wrap',
    },
    input: {
      ...theme.typography.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      minHeight: theme.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radii.md,
    },
    multiline: { minHeight: 96, textAlignVertical: 'top' },
    inputFocused: {
      borderColor: theme.colors.focus,
      borderWidth: 2,
      // Keeps the text in the same position when the border becomes thicker.
      paddingHorizontal: theme.spacing.md - 1,
      outlineStyle: 'none',
    } as object,
    inputError: {
      borderColor: theme.colors.danger,
      borderWidth: 2,
      paddingHorizontal: theme.spacing.md - 1,
    },
    errorRow: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'flex-start' },
    errorText: { flexShrink: 1 },
  });
