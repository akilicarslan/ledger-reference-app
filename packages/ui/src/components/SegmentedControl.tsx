import { Pressable, StyleSheet, View } from 'react-native';
import { focusRing, type InteractionState } from '../a11y/interaction';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Short text under the label, for example "Adds money". */
  description?: string;
  testID?: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Visible group label. It is also the accessible name of the radio group. */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * Single choice between 2 to 4 options. Semantics: `radiogroup` with `radio`
 * items and `aria-checked`. The selected item has a check mark and a thick
 * border, so the state does not depend on color only (WCAG 2.1 SC 1.4.1).
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text variant="label" aria-hidden>
        {label}
      </Text>
      <View role="radiogroup" accessibilityLabel={label} style={styles.group} testID={testID}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={selected}
              accessibilityLabel={
                option.description ? `${option.label}, ${option.description}` : option.label
              }
              onPress={() => onChange(option.value)}
              testID={option.testID}
              style={(state: InteractionState) => [
                styles.option,
                selected ? styles.optionSelected : null,
                state.pressed && !selected ? styles.optionPressed : null,
                focusRing(theme, state),
              ]}
            >
              <View style={styles.optionHeader}>
                <Text aria-hidden variant="bodyStrong" tone={selected ? 'primary' : 'muted'}>
                  {selected ? '◉' : '○'}
                </Text>
                <Text
                  variant="bodyStrong"
                  tone={selected ? 'primary' : 'default'}
                  style={styles.flexText}
                >
                  {option.label}
                </Text>
              </View>
              {option.description ? (
                <Text variant="caption" tone="muted">
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    group: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    option: {
      flexGrow: 1,
      flexBasis: 140,
      minHeight: theme.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      gap: theme.spacing.xxs,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      paddingHorizontal: theme.spacing.md - 1,
      backgroundColor: theme.colors.infoSurface,
    },
    optionPressed: { backgroundColor: theme.colors.surfaceMuted },
    optionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    flexText: { flexShrink: 1 },
  });
