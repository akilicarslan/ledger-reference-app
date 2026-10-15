import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { SegmentedControl, type SegmentedControlProps } from './SegmentedControl';

type Kind = 'credit' | 'debit';

function Controlled(props: SegmentedControlProps<Kind>) {
  const [value, setValue] = useState<Kind>(props.value);
  return <SegmentedControl {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl<Kind>,
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Transaction type',
    value: 'debit',
    onChange: () => {},
    options: [
      { value: 'credit', label: 'Credit', description: 'Add funds' },
      { value: 'debit', label: 'Debit', description: 'Expense or withdrawal' },
    ],
  },
} satisfies Meta<typeof SegmentedControl<Kind>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutDescriptions: Story = {
  args: {
    options: [
      { value: 'credit', label: 'Credit' },
      { value: 'debit', label: 'Debit' },
    ],
  },
};
