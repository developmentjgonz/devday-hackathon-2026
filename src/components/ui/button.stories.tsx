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
    variant: { control: 'select', options: ['default', 'chat-send', 'secondary', 'subtle', 'outline', 'ghost', 'destructive', 'link', 'selection', 'media', 'bubble', 'account', 'table-header', 'view-switcher', 'navigation'] },
    size: { control: 'select', options: ['xs', 'sm', 'segment', 'default', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg', 'icon-group', 'dialog-close', 'content', 'media', 'bubble', 'account'] },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Secondary: Story = { args: { children: 'Add care note', variant: 'secondary' } }
export const Subtle: Story = { args: { children: 'Mark complete', variant: 'subtle', size: 'sm' }, parameters: { docs: { description: { story: 'A neutral filled action for repeated controls that need a clear button shape without primary emphasis.' } } } }
export const Outline: Story = { args: { children: 'View care history', variant: 'outline' } }
export const Ghost: Story = { args: { children: 'Edit visit', variant: 'ghost' } }
export const NavigationAction: Story = { args: { children: 'Sign out', variant: 'navigation' }, parameters: { docs: { description: { story: 'Use for actions beside navigation links. It shares their size, typography, spacing, and press feedback.' } } } }
export const TableHeader: Story = { args: { children: 'Received', variant: 'table-header', size: 'sm' } }
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
export const Bubble: Story = { args: { variant: 'bubble', size: 'bubble', 'aria-label': 'Open cat artwork', children: <img src={catMarkUrl} alt="" className="size-14" /> }, parameters: { docs: { description: { story: 'A round, 64-pixel action for a cat in a bubble chart. Give it an accessible name and place a 56-pixel avatar inside.' } } } }
export const AsLink: Story = { args: { render: <a href="#workspace" />, children: 'Open workspace' } }

export const ChatSend: Story = { args: { variant: 'chat-send', size: 'icon-sm', children: <Plus aria-hidden="true" />, 'aria-label': 'Send message' }, parameters: { docs: { description: { story: 'A compact round neutral action for a conversation composer.' } } } }
