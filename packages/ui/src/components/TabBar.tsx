import { Pressable, StyleSheet, View } from 'react-native';
import { focusRing, type InteractionState } from '../a11y/interaction';
import { webOnlyProps } from '../a11y/platform';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Text } from './Text';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  testID?: string;
}

export interface TabBarProps<K extends string> {
  /** Accessible name of the tab list, for example "Main sections". */
  accessibilityLabel: string;
  tabs: readonly TabItem<K>[];
  selectedKey: K;
  onChange: (key: K) => void;
  /** Id prefix that connects each tab to its panel (`${idPrefix}-panel-${key}`). */
  idPrefix?: string;
}

/**
 * Tabs with `tablist` / `tab` semantics and `aria-selected`. The selected tab
 * has a thick underline and bold text, so the state does not depend on color only.
 */
export function TabBar<K extends string>({
  accessibilityLabel,
  tabs,
  selectedKey,
  onChange,
  idPrefix = 'tabs',
}: TabBarProps<K>) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View role="tablist" accessibilityLabel={accessibilityLabel} style={styles.bar}>
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            role="tab"
            aria-selected={selected}
            accessibilityLabel={tab.label}
            {...webOnlyProps({ 'aria-controls': `${idPrefix}-panel-${tab.key}` })}
            nativeID={`${idPrefix}-tab-${tab.key}`}
            onPress={() => onChange(tab.key)}
            testID={tab.testID}
            style={(state: InteractionState) => [
              styles.tab,
              selected ? styles.tabSelected : null,
              state.pressed ? styles.tabPressed : null,
              focusRing(theme, state),
            ]}
          >
            <Text variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'primary' : 'muted'}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.surface,
    },
    tab: {
      flex: 1,
      minHeight: theme.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabSelected: { borderBottomColor: theme.colors.primary },
    tabPressed: { backgroundColor: theme.colors.surfaceMuted },
  });
