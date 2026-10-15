import { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { fetchAccount, selectSubmit, useAppDispatch, useAppSelector } from '@ledger/core';
import { useTheme } from '@ledger/ui';
import { TestIds } from '../testIds';
import { BalanceCard } from './BalanceCard';
import { RecentTransactions } from './RecentTransactions';
import { RequestTraceCard } from './RequestTraceCard';
import { TransactionForm } from './TransactionForm';

/** Width (dp/px) where the screen changes from one column to two columns. */
export const TWO_COLUMN_BREAKPOINT = 900;

export function AccountScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= TWO_COLUMN_BREAKPOINT;
  const trace = useAppSelector(selectSubmit).trace;
  // `key` gives each user action a fresh card (and a fresh server read).
  const traceCard = trace ? <RequestTraceCard key={trace.traceId} trace={trace} /> : null;

  // No abort on unmount: the request is cheap and idempotent, and the thunk
  // `condition` already prevents parallel duplicates (for example in StrictMode).
  useEffect(() => {
    void dispatch(fetchAccount());
  }, [dispatch]);

  return (
    <ScrollView
      testID={TestIds.screens.account}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
    >
      {/*
        Each layout keeps the reading order equal to the visual order (WCAG 1.3.2).
        Narrow: balance, form, history. Wide: balance and history on the left, form on the right.
      */}
      {wide ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: theme.spacing.lg }}>
            <BalanceCard />
            <RecentTransactions />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.lg }}>
            <TransactionForm />
            {traceCard}
          </View>
        </View>
      ) : (
        <>
          <BalanceCard />
          <TransactionForm />
          {traceCard}
          <RecentTransactions />
        </>
      )}
    </ScrollView>
  );
}
