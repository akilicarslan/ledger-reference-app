import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { label: 'Record transaction', onPress: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger', 'ghost'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Minimum touch target: 48 × 48. The visible label is the accessible name. `loading` sets `aria-busy` and blocks presses.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', label: 'Refresh' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Remove image' } };
export const Ghost: Story = { args: { variant: 'ghost', label: 'Cancel' } };
export const Loading: Story = { args: { loading: true, label: 'Saving' } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = { args: { icon: '＋', label: 'Add image', variant: 'secondary' } };

export const AllVariants: Story = {
  render: (args) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <Button {...args} variant="primary" label="Primary" />
      <Button {...args} variant="secondary" label="Secondary" />
      <Button {...args} variant="danger" label="Danger" />
      <Button {...args} variant="ghost" label="Ghost" />
    </View>
  ),
};
