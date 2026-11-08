import type { Meta, StoryObj } from '@storybook/react-vite'
import { CareSticker, CatMark, CatPawPrint, MewsWordmark } from '@/components/brand-assets'
import { Heading, Text } from '@/components/ui/typography'
import catMarkUrl from '@/assets/mews-cat.svg'
import catPrintUrl from '@/assets/mews-cat-print.svg?no-inline'
import { TextLink } from '@/components/ui/text-link'
import { Button } from '@/components/ui/button'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { CommunityCat } from '@/components/illustrations/community-cat'

const meta = {
  title: 'Foundations/Brand assets',
  component: CatMark,
  parameters: {
    docs: {
      description: {
        component: 'Shared Mews assets: the winking cat mark, Fredoka wordmark, cat paw print, and community illustration. The cat-print SVG supplies app icons and the paw loader; download it from the Cat prints story.',
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
      <TextLink href={catMarkUrl} download="mews-cat.svg">Download cat SVG</TextLink>
    </div>
  ),
}

export const Wordmark: Story = {
  render: () => <MewsWordmark size="lg" />,
}

export const CatPrints: Story = {
  render: () => (
    <div className="max-w-lg space-y-6">
      <Heading size="card">Cat paw print</Heading>
      <Text size="small" tone="muted">Four rounded toe pads and a lobed main pad, with no claw marks. Shared by buttons and the paw loader.</Text>
      <div className="flex items-end gap-6">
        {[16, 24, 48].map((size) => (
          <div key={size} className="space-y-3 text-center">
            <CatPawPrint style={{ width: size, height: size }} aria-hidden={false} role="img" aria-label={`Cat paw print at ${size} pixels`} />
            <Text size="label" tone="muted">{size} px</Text>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button>Log visit <CatPawPrint /></Button>
        <Button loading>Saving visit</Button>
        <LoadingIndicator label="Loading colony updates" />
      </div>
      <TextLink href={catPrintUrl} download="mews-cat-print.svg">Download cat-print SVG</TextLink>
    </div>
  ),
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
