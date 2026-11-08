import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextLink } from './text-link'

const meta = {
  title: 'Actions/Text link',
  component: TextLink,
  args: { href: '#', children: 'About Mews' },
} satisfies Meta<typeof TextLink>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Small: Story = { args: { size: 'sm' } }
export const Underlined: Story = { args: { variant: 'underlined', size: 'sm', children: 'View report: Follow-up care check' }, parameters: { docs: { description: { story: 'Use when a link appears alongside supporting text and needs a visible link cue.' } } } }
export const CurrentPage: Story = { args: { 'aria-current': 'page' } }
export const Navigation: Story = { args: { variant: 'navigation', children: 'Overview', 'aria-current': 'page' } }
export const SkipToContent: Story = { args: { variant: 'skip', href: '#content', children: 'Skip to content' } }
