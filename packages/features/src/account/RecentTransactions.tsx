import { Image, View } from 'react-native';
import type { Transaction } from '@ledger/contracts';
import {
  TRANSACTION_TYPE_LABELS,
  formatDateTime,
  formatSignedMoney,
  selectAccountLoad,
  selectRecentTransactions,
  useAppSelector,
} from '@ledger/core';
import { Badge, Card, List, ListItem, Skeleton, Text, useTheme } from '@ledger/ui';
import { TestIds } from '../testIds';

/** One sentence for screen readers. The row is one accessible element. */
export function describeTransaction(item: Transaction): string {
  const parts = [
    TRANSACTION_TYPE_LABELS[item.type],
    item.title,
    formatSignedMoney(item.amount, item.type),
    formatDateTime(item.dateTime),
  ];
  if (item.description) parts.push(item.description);
  if (item.receiptImage) parts.push('Has a receipt image');
  return parts.join(', ');
}

function Leading({ item }: { item: Transaction }) {
  const theme = useTheme();
  if (item.receiptImage) {
    return (
      <Image
        source={{ uri: item.receiptImage }}
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surfaceMuted,
        }}
        aria-hidden
      />
    );
  }
  const credit = item.type === 'credit';
  return (
    <View
      aria-hidden
      style={{
        width: 44,
        height: 44,
        borderRadius: theme.radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: credit ? theme.colors.successSurface : theme.colors.dangerSurface,
      }}
    >
      <Text variant="heading" tone={credit ? 'success' : 'danger'}>
        {credit ? '↓' : '↑'}
      </Text>
    </View>
  );
}

export function RecentTransactions() {
  const theme = useTheme();
  const items = useAppSelector(selectRecentTransactions);
  const load = useAppSelector(selectAccountLoad);
  const firstLoad = items.length === 0 && (load.status === 'pending' || load.status === 'idle');

  return (
    <Card title="Last 5 transactions" subtitle="Newest first" testID={TestIds.recent.card}>
      {firstLoad ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="caption" tone="muted">
            Loading transactions
          </Text>
          <Skeleton height={44} />
          <Skeleton height={44} />
        </View>
      ) : items.length === 0 ? (
        <Text tone="muted" testID={TestIds.recent.empty}>
          No transactions yet. Use the form to record the first transaction.
        </Text>
      ) : (
        <List accessibilityLabel="Last 5 transactions" testID={TestIds.recent.list}>
          {items.map((item, index) => (
            <ListItem
              key={item.id}
              testID={TestIds.recent.row(index)}
              title={item.title}
              subtitle={item.description || undefined}
              meta={formatDateTime(item.dateTime)}
              leading={<Leading item={item} />}
              accessibilityLabel={describeTransaction(item)}
              trailing={
                <>
                  <Text
                    variant="bodyStrong"
                    tabular
                    tone={item.type === 'credit' ? 'success' : 'danger'}
                    align="right"
                  >
                    {formatSignedMoney(item.amount, item.type)}
                  </Text>
                  <Badge
                    label={TRANSACTION_TYPE_LABELS[item.type]}
                    tone={item.type === 'credit' ? 'success' : 'danger'}
                  />
                </>
              }
            />
          ))}
        </List>
      )}
    </Card>
  );
}
