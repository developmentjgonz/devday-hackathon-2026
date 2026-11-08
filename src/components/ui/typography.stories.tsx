import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heading, HeadingAccent, Text } from './typography'

const meta = {
  title: 'Foundations/Typography',
  component: Heading,
  args: { children: 'Today’s visits', size: 'section', level: 2 },
  argTypes: {
    size: {
      control: 'select',
      options: ['display', 'title', 'section', 'card', 'compact', 'label'],
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
          ['display', 'Every cat counts.', '44 → 72 px · line height 1.02'],
          ['title', 'Care for your colony', '30 → 36 px · line height 1.25'],
          ['section', 'Today’s visits', '24 px · line height 1.2'],
          ['card', 'Canal colony', '18 px · line height 1.35'],
          ['compact', 'North service area', '16 px · line height 1.5'],
          ['label', 'Browse colonies', '12 px · line height 1.67'],
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
export const Accent: Story = {
  render: () => <Heading level={1} size="display">Track cat colonies.<br /><HeadingAccent>Care together.</HeadingAccent></Heading>,
}
export const Body: Story = {
  render: () => (
    <div className="w-full space-y-6">
      {(
        [
          ['metric', '24', '24 px · line height 1.2'],
          ['lead', 'Feeding visits, cat records, and care needs in one shared place.', '18 px / 32 px'],
          [
            'body',
            'Miso and Pepper joined the morning feeding. All 8 cats were seen.',
            '16 px / 28 px',
          ],
          ['small', 'Last visit today at 8:15 am', '14 px / 24 px'],
          ['label', 'Next feeding', '12 px / 20 px · semibold'],
          ['caption', 'Member · Last seen today', '12 px / 20 px'],
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
export const InlineText: Story = {
  render: () => <Text size="small">Reviewed by <Text render={<span />} size="small" weight="semibold">Maya Rivera</Text>.</Text>,
}

export const FocusTarget: Story = {
  args: { children: 'Your report has been sent', focusTarget: true },
  parameters: { docs: { description: { story: 'A heading can receive programmatic focus after a form completes. It stays outside the Tab order and has no control-like outline; interactive actions keep their own focus indicators.' } } },
}
