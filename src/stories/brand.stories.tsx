import type { Meta, StoryObj } from '@storybook/react-vite'
import { CareSticker, CatMark, MewsWordmark } from '@/components/brand-assets'
import { Heading, Text } from '@/components/ui/typography'
import catMarkUrl from '@/assets/mews-cat.svg'
import { CommunityCat } from '@/components/illustrations/community-cat'

const meta = {
  title: 'Foundations/Brand assets',
  component: CatMark,
  parameters: {
    docs: {
      description: {
        component: 'A custom winking cat mark and a lowercase Fredoka wordmark. The SVG is shared by the app and these stories. Cat care examples use fictional records; actions only change local preview state.',
      },
    },
  },
} satisfies Meta<typeof CatMark>
export default meta
type Story = StoryObj<typeof meta>

export const Mark: Story = {
  render: () => (
    <div className="space-y-5">
      <CatMark className="size-24" />
      <a href={catMarkUrl} download="mews-cat.svg" className="text-sm text-primary-text underline underline-offset-4">Download cat SVG</a>
    </div>
  ),
}

export const Wordmark: Story = {
  render: () => <MewsWordmark className="text-5xl" />,
}

export const CommunityIllustration: Story = {
  render: () => <CommunityCat className="w-full max-w-xl" />,
  parameters: {
    docs: { description: { story: 'Original, responsive brand artwork shared by the landing and About pages. Colors use the same theme tokens as the component library.' } },
  },
}

export const CareStickerBadge: Story = {
  render: () => (
    <div className="grid min-h-64 place-items-center rounded-surface bg-brand-background p-10">
      <CareSticker />
    </div>
  ),
}

export const SmallSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {[24, 32, 48].map((size) => (
        <div key={size} className="space-y-2 text-center">
          <CatMark style={{ width: size, height: size }} />
          <span className="font-mono text-xs text-muted-foreground">{size} px</span>
        </div>
      ))}
    </div>
  ),
}

export const DisplayHeading: Story = {
  render: () => (
    <div className="max-w-lg space-y-6">
      <MewsWordmark />
      <Heading level={1} size="display">Every cat counts.</Heading>
      <Text tone="muted">Keep track of feeding visits, fresh water, and the cats who count on you.</Text>
    </div>
  ),
}
