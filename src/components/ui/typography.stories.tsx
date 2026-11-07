import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heading, Text } from './typography'

const meta = {
  title: 'Foundations/Typography',
  component: Heading,
  args: { children: 'Today’s visits', size: 'section', level: 2 },
  argTypes: {
    size: {
      control: 'select',
      options: ['display', 'title', 'section', 'card'],
    },
    level: { control: 'select', options: [1, 2, 3, 4, 5, 6] },
  },
} satisfies Meta<typeof Heading>
export default meta
type Story = StoryObj<typeof meta>

export const Headings: Story = {
  render: () => (
    <div className="w-full space-y-7">
      {(
        [
          ['display', 'Every cat counts.', '48 → 72 px · line height 1.02'],
          ['title', 'Care for your colony', '30 → 36 px · line height 1.25'],
          ['section', 'Today’s visits', '24 px · line height 1.2'],
          ['card', 'Canal colony', '18 px · line height 1.35'],
        ] as const
      ).map(([size, label, detail]) => (
        <div key={size} className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            size="{size}" · {detail}
          </p>
          <Heading level={4} size={size}>
            {label}
          </Heading>
        </div>
      ))}
    </div>
  ),
}
export const Display: Story = {
  args: { children: 'Every cat counts.', size: 'display' },
}
export const Body: Story = {
  render: () => (
    <div className="w-full space-y-6">
      {(
        [
          [
            'body',
            'Miso and Pepper joined the morning feeding. All 8 cats were seen.',
            '16 px / 28 px',
          ],
          ['small', 'Last visit today at 8:15 am', '14 px / 24 px'],
          ['label', 'Next feeding', '12 px / 20 px · semibold'],
        ] as const
      ).map(([size, label, detail]) => (
        <div key={size} className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            size="{size}" · {detail}
          </p>
          <Text size={size}>{label}</Text>
          <Text size={size} tone="muted">
            {label}
          </Text>
        </div>
      ))}
    </div>
  ),
}
export const Playground: Story = {}
