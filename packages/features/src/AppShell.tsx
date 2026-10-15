import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TabBar, Text, useThemedStyles, webOnlyProps, type TabItem, type Theme } from '@ledger/ui';
import { AccountScreen } from './account/AccountScreen';
import { MarketsScreen } from './markets/MarketsScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { TestIds } from './testIds';

type TabKey = 'account' | 'markets';

const TABS: readonly TabItem<TabKey>[] = [
  { key: 'account', label: 'Account', testID: TestIds.tabs.account },
  { key: 'markets', label: 'Markets', testID: TestIds.tabs.markets },
];

const SECTION_NAMES: Record<TabKey, string> = { account: 'Account', markets: 'Markets' };

/** Maximum content width on large screens. Long lines are hard to read. */
const MAX_CONTENT_WIDTH = 1120;

/** App frame: header, tab bar and the selected screen. Mobile and web use it. */
export function AppShell() {
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<TabKey>('account');

  return (
    <View style={styles.root}>
      <View style={styles.header} {...webOnlyProps({ role: 'banner' })}>
        <View style={styles.inner}>
          <Text variant="title" headingLevel={1}>
            Ledger
          </Text>
          <Text variant="caption" tone="muted">
            Local account · USD
          </Text>
        </View>
      </View>
      <View style={styles.tabs} {...webOnlyProps({ role: 'navigation', 'aria-label': 'Main' })}>
        <View style={styles.inner}>
          <TabBar
            accessibilityLabel="Main sections"
            tabs={TABS}
            selectedKey={tab}
            onChange={setTab}
            idPrefix="main"
          />
        </View>
      </View>
      <View
        style={[styles.content, styles.inner]}
        nativeID={`main-panel-${tab}`}
        {...webOnlyProps({ role: 'tabpanel', 'aria-labelledby': `main-tab-${tab}` })}
      >
        {/* One boundary for each tab: an error in one tab does not stop the tab bar.
            The key resets the boundary when the user selects a different tab. */}
        <ErrorBoundary key={tab} section={SECTION_NAMES[tab]}>
          {tab === 'account' ? <AccountScreen /> : <MarketsScreen />}
        </ErrorBoundary>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.canvas },
    header: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    tabs: { backgroundColor: theme.colors.surface },
    inner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
    content: { flex: 1 },
  });
