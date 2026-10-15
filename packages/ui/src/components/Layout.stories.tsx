import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { AttachmentField } from './AttachmentField';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { List, ListItem } from './List';
import { TabBar } from './TabBar';
import { Text } from './Text';

const meta = {
  title: 'Components/Layout',
  component: Card,
  args: { title: 'Last 5 transactions', subtitle: 'Newest first' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
  {
    id: '1',
    title: 'Salary',
    subtitle: 'October payment',
    meta: 'Oct 13, 2026, 09:00 AM',
    type: 'credit',
    amount: '+$2,500.00',
  },
  {
    id: '2',
    title: 'Office supplies',
    subtitle: 'Printer paper and toner',
    meta: 'Oct 12, 2026, 04:10 PM',
    type: 'debit',
    amount: '−$64.20',
  },
  {
    id: '3',
    title: 'Cash withdrawal',
    subtitle: '',
    meta: 'Oct 11, 2026, 11:45 AM',
    type: 'debit',
    amount: '−$200.00',
  },
] as const;

export const CardWithList: Story = {
  render: (args) => (
    <Card {...args} headerAction={<Button label="Refresh" variant="secondary" onPress={fn()} />}>
      <List accessibilityLabel="Last 5 transactions">
        {ROWS.map((row) => (
          <ListItem
            key={row.id}
            title={row.title}
            subtitle={row.subtitle || undefined}
            meta={row.meta}
            accessibilityLabel={`${row.type === 'credit' ? 'Credit' : 'Debit'}, ${row.title}, ${row.amount}, ${row.meta}`}
            trailing={
              <>
                <Text
                  variant="bodyStrong"
                  tone={row.type === 'credit' ? 'success' : 'danger'}
                  tabular
                >
                  {row.amount}
                </Text>
                <Badge
                  label={row.type === 'credit' ? 'Credit' : 'Debit'}
                  tone={row.type === 'credit' ? 'success' : 'danger'}
                />
              </>
            }
          />
        ))}
      </List>
    </Card>
  ),
};

function TabsDemo() {
  const [selected, setSelected] = useState<'account' | 'markets'>('account');
  return (
    <View style={{ gap: 16 }}>
      <TabBar
        accessibilityLabel="Main sections"
        selectedKey={selected}
        onChange={setSelected}
        tabs={[
          { key: 'account', label: 'Account' },
          { key: 'markets', label: 'Markets' },
        ]}
      />
      <Text>{selected === 'account' ? 'Account panel' : 'Markets panel'}</Text>
    </View>
  );
}

export const Tabs: Story = { render: () => <TabsDemo /> };

const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const Attachment: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <AttachmentField
        label="Receipt image (optional)"
        hint="PNG or JPEG. Maximum 1 MB."
        imageUri={null}
        imageAccessibilityLabel="Receipt image"
        onPick={fn()}
        onRemove={fn()}
      />
      <AttachmentField
        label="Receipt image (optional)"
        imageUri={null}
        imageAccessibilityLabel="Receipt photo"
        onPick={fn()}
        onRemove={fn()}
        onTakePhoto={fn()}
        preview={
          <View
            accessible
            role="img"
            accessibilityLabel="Receipt photo for Office supplies (native preview placeholder)"
            style={{ flex: 1, backgroundColor: '#8A94A6' }}
          />
        }
        details="960 × 1280 · 4.7 MB shared with JavaScript, no copy · native decode 4 ms · JS analysis 1.9 ms"
        warning="The photo is dark. The receipt text can be hard to read. Take the photo again in more light."
      />
      <AttachmentField
        label="Receipt image (optional)"
        imageUri={SAMPLE_IMAGE}
        imageAccessibilityLabel="Receipt image for Office supplies"
        onPick={fn()}
        onRemove={fn()}
      />
    </View>
  ),
};
