import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from 'V2/Components/UI/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Buttons/Button',
  component: Button,
};

type Story = StoryObj<typeof Button>;

const Primary: Story = {
  render: args => (
    <div className="tw-content">
      <Button styling={args.styling} size={args.size} disabled={args.disabled} color={args.color}>
        {args.children}
      </Button>
    </div>
  ),
};

const Basic: Story = {
  ...Primary,
  args: {
    styling: 'solid',
    color: 'primary',
    size: 'medium',
    disabled: false,
    children: 'Button name',
  },
};
export { Basic };
export default meta;
