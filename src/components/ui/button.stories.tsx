import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { Button } from './button'
import catMarkUrl from '@/assets/mews-cat.svg'
import { ButtonStateDemo } from '@/stories/examples/button-state-demo'

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Log visit', variant: 'default', size: 'default', disabled: false, loading: false },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link', 'selection', 'media', 'account'] },
    size: { control: 'select', options: ['xs', 'sm', 'default', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg', 'content', 'media', 'account'] },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Secondary: Story = { args: { children: 'Add care note', variant: 'secondary' } }
export const Outline: Story = { args: { children: 'View care history', variant: 'outline' } }
export const Ghost: Story = { args: { children: 'Edit visit', variant: 'ghost' } }
export const Destructive: Story = { args: { children: 'Delete care note', variant: 'destructive' } }
export const Link: Story = { args: { children: 'View colony', variant: 'link' } }
export const Disabled: Story = { args: { disabled: true } }
export const WithIcon: Story = {
  args: { children: <><Plus aria-hidden="true" />Add cat</> },
  argTypes: { children: { control: false } },
}

export const Loading: Story = { args: { children: 'Saving visit', loading: true } }
export const StateChanges: Story = {
  render: () => <ButtonStateDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Use Next state to cycle through ready, loading, and complete. ButtonLabel reserves space for every supplied label. Loading keeps the content in place for sizing and its accessible name, hides it visually, and centers the shared cat-print indicator without changing button dimensions.',
      },
    },
  },
}
export const Media: Story = { args: { variant: 'media', size: 'media', 'aria-label': 'Open cat artwork', children: <img src={catMarkUrl} alt="Mews cat mark" className="h-32 w-40 object-contain" /> } }
export const AsLink: Story = { args: { render: <a href="#workspace" />, children: 'Open workspace' } }
