import { View } from 'react-native';
import {
  fetchAccount,
  formatMoney,
  formatTime,
  selectAccountLoad,
  selectBalance,
  useAppDispatch,
  useAppSelector,
} from '@ledger/core';
import { Banner, Button, Card, LiveRegion, Skeleton, Text, useTheme } from '@ledger/ui';
import { TestIds } from '../testIds';

export function BalanceCard() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const balance = useAppSelector(selectBalance);
  const load = useAppSelector(selectAccountLoad);
  const loading = load.status === 'pending';
  const reload = () => {
    void dispatch(fetchAccount());
  };

  return (
    <Card
      title="Current balance"
      testID={TestIds.balance.card}
      headerAction={
        balance ? (
          <Button
            label="Refresh"
            variant="secondary"
            onPress={reload}
            loading={loading}
            accessibilityHint="Reads the balance and the last transactions again."
            testID={TestIds.balance.refresh}
          />
        ) : null
      }
    >
      {balance ? (
        <View
          accessible
          accessibilityLabel={`Current balance: ${formatMoney(balance.amount, balance.currency)}. Updated at ${formatTime(balance.updatedAt)}.`}
          style={{ gap: theme.spacing.xxs }}
        >
          <Text variant="display" tabular testID={TestIds.balance.amount}>
            {formatMoney(balance.amount, balance.currency)}
          </Text>
          <Text variant="caption" tone="muted">
            {`Updated at ${formatTime(balance.updatedAt)}`}
          </Text>
        </View>
      ) : loading || load.status === 'idle' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="caption" tone="muted">
            Loading balance
          </Text>
          <Skeleton width={200} height={36} />
        </View>
      ) : null}

      <LiveRegion politeness="assertive" message={load.error?.message}>
        {load.error ? (
          <Banner
            tone="error"
            title={balance ? 'The balance was not refreshed' : 'The balance cannot be loaded'}
            message={load.error.message}
            action={{ label: 'Try again', onPress: reload }}
            reference={load.error.traceId}
            testID={TestIds.balance.loadError}
          />
        ) : null}
      </LiveRegion>
    </Card>
  );
}
