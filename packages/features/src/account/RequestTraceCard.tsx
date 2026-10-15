import { View } from 'react-native';
import type { TraceEvent } from '@ledger/contracts';
import { formatTime, useServerTrace, type ClientTrace } from '@ledger/core';
import { Badge, Button, Card, List, ListItem, Text, useTheme, type BadgeTone } from '@ledger/ui';
import { TestIds } from '../testIds';

/** Plain-language names for the server events (ASD-STE100). */
const EVENT_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  'http.request.received': { label: 'The server received the request', tone: 'info' },
  'validation.passed': { label: 'The request data is correct', tone: 'success' },
  'validation.failed': { label: 'The request data is not correct', tone: 'danger' },
  'ledger.transaction.recorded': { label: 'The ledger saved the transaction', tone: 'success' },
  'ledger.transaction.replayed': {
    label: 'The ledger already had this transaction (safe retry, nothing recorded again)',
    tone: 'info',
  },
  'ledger.idempotency.conflict': {
    label: 'The request key belongs to a different transaction',
    tone: 'danger',
  },
  'ledger.transaction.refused': {
    label: 'The ledger refused the transaction (balance too low)',
    tone: 'danger',
  },
  'http.error': { label: 'The server sent an error', tone: 'danger' },
  'http.response.sent': { label: 'The server sent the response', tone: 'info' },
};

function describeEvent(event: TraceEvent): { label: string; tone: BadgeTone } {
  return EVENT_LABELS[event.name] ?? { label: event.name, tone: 'neutral' };
}

/** Selected attributes for the row subtitle. */
function eventDetails(event: TraceEvent): string | undefined {
  const { attributes } = event;
  const parts: string[] = [];
  if (typeof attributes.method === 'string')
    parts.push(`${attributes.method} ${String(attributes.path)}`);
  if (typeof attributes.status === 'number') parts.push(`HTTP ${attributes.status}`);
  if (typeof attributes.code === 'string') parts.push(attributes.code);
  if (typeof attributes.transactionId === 'string')
    parts.push(`transaction ${attributes.transactionId.slice(0, 8)}`);
  if (typeof attributes.availableCents === 'number')
    parts.push(`available ${(attributes.availableCents / 100).toFixed(2)}`);
  if (event.durationMs !== undefined) parts.push(`${event.durationMs} ms`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export interface RequestTraceCardProps {
  trace: ClientTrace;
}

/**
 * Shows the full path of one user action: the client view (start time and
 * total duration) and each server step from `GET /api/v1/traces/{traceId}`.
 * The times of the server steps are relative to the moment the server received
 * the request, so a clock difference between device and server has no effect.
 */
export function RequestTraceCard({ trace }: RequestTraceCardProps) {
  const theme = useTheme();
  const server = useServerTrace(trace.traceId);

  return (
    <Card
      title="Request trace"
      subtitle="The path of the last submit, from the app to the ledger file."
      testID={TestIds.trace.card}
      headerAction={
        <Button
          label="Reload"
          variant="ghost"
          onPress={server.refetch}
          accessibilityHint="Reads the server events again."
        />
      }
    >
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="caption" tone="muted">
          Reference ID (trace ID)
        </Text>
        <Text variant="bodyStrong" selectable tabular testID={TestIds.trace.id}>
          {trace.traceId}
        </Text>
        <Text variant="caption" tone="muted">
          {`App: started at ${formatTime(trace.startedAt)}, response after ${trace.durationMs} ms${
            trace.attempts && trace.attempts > 1
              ? `, ${trace.attempts} attempts (automatic retry)`
              : ''
          }.`}
        </Text>
      </View>

      {server.isLoading ? (
        <Text variant="caption" tone="muted">
          Loading the server events.
        </Text>
      ) : server.error ? (
        <Text variant="caption" tone="danger">
          {`The server events cannot be loaded. ${server.error.message}`}
        </Text>
      ) : server.events.length === 0 ? (
        <Text variant="caption" tone="muted">
          The server has no events for this reference.
        </Text>
      ) : (
        <List accessibilityLabel="Server events" testID={TestIds.trace.events}>
          {server.events.map((event, index) => {
            const { label, tone } = describeEvent(event);
            const elapsed =
              typeof event.attributes.elapsedMs === 'number' ? event.attributes.elapsedMs : 0;
            const details = eventDetails(event);
            return (
              <ListItem
                key={`${event.name}-${index}`}
                testID={TestIds.trace.event(event.name)}
                title={label}
                subtitle={details}
                meta={event.name}
                accessibilityLabel={`Server step ${index + 1}: ${label}${details ? `, ${details}` : ''}, at plus ${elapsed} milliseconds`}
                trailing={<Badge label={`+${elapsed} ms`} tone={tone} />}
              />
            );
          })}
        </List>
      )}
    </Card>
  );
}
