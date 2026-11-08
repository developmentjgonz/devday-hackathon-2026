import { useId, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, ButtonLabel } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardList } from './card'
import { Heading, Text } from './typography'
import { Separator } from './separator'

function CardPreview() {
  const [saved, setSaved] = useState(false)
  return (
    <Card className="w-80 max-w-full">
      <CardHeader>
        <CardTitle><h2>Canal colony</h2></CardTitle>
        <CardDescription>8 cats · Morning feeding</CardDescription>
      </CardHeader>
      <CardContent><p className="text-muted-foreground">8 cats seen. Food and water bowls refilled. Miso and Pepper were both present.</p></CardContent>
      <CardFooter className="justify-between gap-3">
        <span role="status" className="text-xs text-muted-foreground">{saved ? 'Visit logged' : 'Visit not logged'}</span>
        <Button variant="outline" disabled={saved} onClick={() => setSaved(true)}><ButtonLabel labels={['Log visit', 'Logged']}>{saved ? 'Logged' : 'Log visit'}</ButtonLabel></Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: 'Display/Card',
  component: Card,
  render: () => <CardPreview />,
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>
export const WithAction: Story = {}
export const EdgeToEdgeList: Story = {
  render: () => <Card padding="none" className="w-80 max-w-full"><CardHeader className="py-6"><Heading size="card">Care updates</Heading></CardHeader><Separator /><CardList>{['Fresh water added', 'Morning feeding complete'].map((update) => <li key={update} className="px-6 py-4"><Text size="small">{update}</Text></li>)}</CardList></Card>,
}
export const Note: Story = {
  render: () => <Card tone="note" size="sm" className="w-80 max-w-full"><CardContent className="space-y-3"><Text size="caption" tone="muted">Riverside</Text><Heading size="card" level={3}>Arrange a care check</Heading><Text size="caption" tone="muted">Due Nov 8, 2026</Text></CardContent></Card>,
  parameters: { docs: { description: { story: 'The note tone is a warm, understated surface for short pieces of work. It supports light and dark themes.' } } },
}
export const Subtle: Story = {
  render: () => <Card tone="subtle" size="sm" className="w-80 max-w-full"><CardContent><Text size="caption" tone="muted">Latest feeding report</Text><Text size="small" weight="medium">Nov 7, 8:05 AM · Needs review</Text></CardContent></Card>,
  parameters: { docs: { description: { story: 'A quiet inset surface for supporting information inside a larger card.' } } },
}
export const Message: Story = {
  render: () => <Card tone="message" size="sm" className="w-fit max-w-80"><CardContent><Text size="small">I saw a cat near the park.</Text></CardContent></Card>,
  parameters: { docs: { description: { story: 'A compact message surface for the visitor’s side of a conversation.' } } },
}
export const Interactive: Story = {
  render: () => <Card interactive size="sm" render={<a href="#colony" />} className="w-80 max-w-full"><CardContent className="space-y-1"><Heading size="card">Canal colony</Heading><Text size="caption" tone="muted">8 known cats</Text></CardContent></Card>,
  parameters: { docs: { description: { story: 'An interactive card is a single link with a shared hover and focus state. Use it when the entire card opens one record.' } } },
}


function DisclosureCardPreview() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const titleId = useId()
  return <div className="w-80 max-w-full space-y-3">
    <Card tone="note" size="sm" interactive className="relative" onClick={() => setOpen((value) => !value)} render={<section aria-labelledby={titleId} />}>
      <CardContent className="space-y-3">
        <Heading id={titleId} size="compact">My tasks</Heading>
        <Button className="absolute right-2 top-2" variant="ghost" size="icon-sm" aria-label={open ? 'Hide tasks' : 'Show tasks'} aria-expanded={open} aria-controls={panelId}>
          {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </Button>
        <Text size="metric" weight="semibold">2 open</Text>
      </CardContent>
    </Card>
    <div id={panelId} hidden={!open}><Text size="small">Check food and water.</Text></div>
  </div>
}

export const InteractiveDisclosure: Story = {
  render: () => <DisclosureCardPreview />,
  parameters: { docs: { description: { story: 'A single-action card can toggle a disclosure. Keep a native button with an accessible name and expanded state for keyboard and screen-reader users.' } } },
}
