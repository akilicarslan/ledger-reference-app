import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { TextField, type TextFieldProps } from './TextField';

function ControlledField(props: TextFieldProps) {
  const [value, setValue] = useState(props.value ?? '');
  return <TextField {...props} value={value} onChangeText={setValue} />;
}

const meta = {
  title: 'Components/TextField',
  component: TextField,
  render: (args) => <ControlledField {...args} />,
  args: { label: 'Title', value: '' },
  parameters: {
    docs: {
      description: {
        component:
          'Visible label = accessible name. Hint and error are in `accessibilityHint` on iOS/Android and in `aria-describedby` on the web. Errors use text and an icon, not color only.',
      },
    },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const WithHint: Story = {
  args: {
    label: 'Amount',
    hint: 'Use a maximum of 2 decimals, for example 12.50.',
    keyboardType: 'decimal-pad',
  },
};
export const WithError: Story = {
  args: {
    label: 'Amount',
    required: true,
    value: '12.345',
    error: 'Enter a number with a maximum of 2 decimals, for example 12.50.',
  },
};
export const Multiline: Story = {
  args: { label: 'Description', multiline: true, hint: 'Optional. Maximum 500 characters.' },
};
