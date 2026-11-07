import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heading, Text } from './typography'

const meta = {
  title: 'Foundations/Typography',
  component: Heading,
  args: { children: 'Section heading', size: 'section', level: 2 },
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
          ['display', 'Display', '48 → 72 px · line height 0.98'],
          ['title', 'Title', '30 → 36 px · line height 1.25'],
          ['section', 'Section', '24 px · line height 1.25'],
          ['card', 'Card', '18 px · line height 1.375'],
        ] as const
      ).map(([size, label, detail]) => (
        <div key={size} className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            size="{size}" · {detail}
          </p>
          <Heading level={4} size={size}>
            {label} heading
          </Heading>
        </div>
      ))}
    </div>
  ),
}
export const Display: Story = {
  args: { children: 'Display heading', size: 'display' },
}
export const Body: Story = {
  render: () => (
    <div className="w-full space-y-6">
      {(
        [
          ['body', 'Body text', '16 px / 28 px'],
          ['small', 'Small text', '14 px / 24 px'],
          ['label', 'Label text', '12 px / 20 px · uppercase'],
        ] as const
      ).map(([size, label, detail]) => (
        <div key={size} className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            size="{size}" · {detail}
          </p>
          <Text size={size}>{label} · Default tone</Text>
          <Text size={size} tone="muted">
            {label} · Muted tone
          </Text>
        </div>
      ))}
    </div>
  ),
}
export const Playground: Story = {}
