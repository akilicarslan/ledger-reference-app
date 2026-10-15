import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { LiveRegion } from '../a11y/LiveRegion';
import { Badge } from './Badge';
import { Banner } from './Banner';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

const meta = {
  title: 'Components/Feedback',
  component: Banner,
  args: {
    tone: 'error',
    message: 'The transaction is refused. The balance cannot go below $0.00.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Banner shows a status message. Put it in a `LiveRegion` so TalkBack and browsers read it, and VoiceOver gets an announcement. The title tells the tone in text, so the meaning does not depend on color.',
      },
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ErrorBanner: Story = {
  render: (args) => (
    <LiveRegion politeness="assertive" message={args.message}>
      <Banner {...args} />
    </LiveRegion>
  ),
};

export const WithReferenceId: Story = {
  render: () => (
    <Banner
      tone="error"
      title="Transaction refused"
      message="The transaction is refused. The balance cannot go below $0.00. Available balance: $20.00."
      reference="4bf92f3577b34da6a3ce929d0e0e4736"
    />
  ),
};

export const AllTones: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Banner tone="info" message="The server shows data from 10:42." />
      <Banner tone="success" message="Transaction recorded. New balance: $1,250.00." />
      <Banner
        tone="warning"
        message="The market service does not answer. The app shows delayed data."
      />
      <Banner
        tone="error"
        message="The app cannot connect to the server."
        action={{ label: 'Try again', onPress: fn() }}
      />
    </View>
  ),
};

export const Badges: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Badge label="Neutral" />
      <Badge label="Live" tone="success" />
      <Badge label="Delayed" tone="warning" />
      <Badge label="Debit" tone="danger" />
      <Badge label="Info" tone="info" />
    </View>
  ),
};

export const LoadingSkeleton: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text variant="caption" tone="muted">
        Loading balance
      </Text>
      <Skeleton width={180} height={32} />
      <Skeleton width="60%" />
    </View>
  ),
};
