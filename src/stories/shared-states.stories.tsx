import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Disclosure } from '@/components/ui/disclosure'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecordButton } from '@/components/ui/record-button'
import { ReportListItem } from '@/components/ui/report-list-item'
import { SelectField } from '@/components/ui/select-field'
import { Table, TableCell, TableOpenButton, TableRow } from '@/components/ui/table'
import { TextLink } from '@/components/ui/text-link'
import { Textarea } from '@/components/ui/textarea'
import { Text } from '@/components/ui/typography'
import { ViewTabs } from '@/components/ui/view-tabs'
import { ColonyMap } from '@/components/ui/colony-map'
import { Brand } from '@/components/brand'
import { publicMapData } from './fixtures/public-map-data'
import { badgeStateVariants, buttonStateVariants } from './fixtures/interaction-contracts'

const meta = {
  title: 'Foundations/Interaction states',
  parameters: {
    layout: 'padded',
    docs: { description: { component: 'Browser validation fixtures using production shared components. Hover is temporary feedback. Selected/current indicators stay visible during hover and focus. Keyboard focus adds a separate visible ring or outline. Disabled and loading controls cannot activate. Open overlays retain an expanded marker and return focus on dismissal. Run npm run test:ui for both themes, narrow screens, and simulated touch. Passive components have no invented interactive states. See docs/component-library.md for coverage and extension rules.' } },
  },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function ButtonStates() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  return <div className="grid gap-6 sm:grid-cols-3">{buttonStateVariants.map((variant) => (
    <section key={variant} aria-label={variant} className="grid justify-items-start gap-3 p-2">
      <Button variant={variant} aria-label={`${variant} action`} onClick={() => setCounts((values) => ({ ...values, [variant]: (values[variant] ?? 0) + 1 }))}>Log visit</Button>
      <Button variant={variant} disabled aria-label={`${variant} disabled`} onClick={() => setCounts((values) => ({ ...values, [variant]: (values[variant] ?? 0) + 1 }))}>Log visit</Button>
      <Button variant={variant} loading aria-label={`${variant} loading`} onClick={() => setCounts((values) => ({ ...values, [variant]: (values[variant] ?? 0) + 1 }))}>Saving visit</Button>
      <Button variant={variant} render={<a href="#destination" />} aria-label={`${variant} link`} onClick={() => setCounts((values) => ({ ...values, [variant]: (values[variant] ?? 0) + 1 }))}>View colony</Button>
      <Button variant={variant} render={<a href="#destination" />} disabled aria-label={`${variant} disabled link`} onClick={() => setCounts((values) => ({ ...values, [variant]: (values[variant] ?? 0) + 1 }))}>View colony</Button>
      <Button variant={variant} render={<a href="#destination" />} loading aria-label={`${variant} loading link`} onClick={() => setCounts((values) => ({ ...values, [variant]: (values[variant] ?? 0) + 1 }))}>Opening colony</Button>
      <output aria-label={`${variant} activations`}>{counts[variant] ?? 0}</output>
    </section>
  ))}<div id="destination" tabIndex={-1}>Colony details</div></div>
}
export const Buttons: Story = { render: () => <ButtonStates /> }

export const Fields: Story = {
  render: () => <div className="grid max-w-4xl gap-6 sm:grid-cols-3">{(['default', 'invalid', 'disabled'] as const).map((state) => (
    <section key={state} aria-label={state} className="grid content-start gap-3 p-2">
      <Label htmlFor={`name-${state}`}>Cat name ({state})</Label><Input id={`name-${state}`} disabled={state === 'disabled'} aria-invalid={state === 'invalid'} />
      <Label htmlFor={`notes-${state}`}>Care notes ({state})</Label><Textarea id={`notes-${state}`} disabled={state === 'disabled'} aria-invalid={state === 'invalid'} />
      <Label htmlFor={`area-${state}`}>Colony ({state})</Label><SelectField id={`area-${state}`} disabled={state === 'disabled'} aria-invalid={state === 'invalid'}><option value="canal">Canal colony</option><option value="riverside">Riverside colony</option></SelectField>
      <div className="flex items-center gap-3"><Checkbox id={`water-${state}`} disabled={state === 'disabled'} aria-invalid={state === 'invalid'} /><Label htmlFor={`water-${state}`}>Fresh water ({state})</Label></div>
    </section>
  ))}</div>,
}

function SelectionStates() {
  const [record, setRecord] = useState('Canal')
  const [report, setReport] = useState('Morning feeding')
  const [tab, setTab] = useState('review')
  return <div className="grid max-w-4xl gap-8 sm:grid-cols-2">
    <section aria-label="Records" className="grid content-start gap-2 p-2">{['Canal', 'Riverside'].map((name) => <RecordButton key={name} title={name} description="Colony care record" selected={record === name} onClick={() => setRecord(name)} />)}</section>
    <section aria-label="Reports" className="p-2">{['Morning feeding', 'Fresh water'].map((name) => <ReportListItem key={name} title={name} summary="Care report" meta="Canal colony" selected={report === name} onClick={() => setReport(name)} />)}<ReportListItem title="Unavailable report" summary="Care report" meta="Canal colony" disabled /></section>
    <section aria-label="Tabs" className="p-2"><ViewTabs label="Report views" value={tab} onValueChange={setTab} items={[{ value: 'review', label: 'To review' }, { value: 'done', label: 'Processed' }]} /></section>
    <section aria-label="Table" className="p-2"><Table><caption>Care reports</caption><tbody>{['Morning feeding', 'Fresh water'].map((name) => <TableRow key={name} interactive selected={report === name}><TableCell><TableOpenButton onClick={() => setReport(name)}>{name}</TableOpenButton></TableCell></TableRow>)}</tbody></Table></section>
    <section aria-label="Disclosure" className="p-2"><Disclosure title="Review history">Maya confirmed the colony.</Disclosure></section>
  </div>
}
export const Selection: Story = { render: () => <SelectionStates /> }

export const Links: Story = {
  render: () => <MemoryRouter><div className="grid max-w-xl gap-6 p-2">
    <Brand to="/" />
    <TextLink href="#destination">About Mews</TextLink><TextLink size="sm" href="#destination">Care details</TextLink>
    <TextLink href="#destination" aria-current="page">Current page</TextLink>
    <TextLink variant="navigation" href="#destination">Other page</TextLink><TextLink variant="navigation" href="#destination" aria-current="page">Current workspace page</TextLink>
    <TextLink variant="skip" href="#destination">Skip to content</TextLink>
    <Card render={<a href="#destination" />} className="p-6">Open colony card</Card>
    <Text render={<a href="#destination" />}>Care text link</Text>
    {badgeStateVariants.map((variant) => <section key={variant} aria-label={`${variant} badge`} className="flex gap-4 p-2"><Badge variant={variant} render={<a href="#destination" />}>View colony</Badge><Badge variant={variant}>Care status</Badge></section>)}
    <div id="destination" tabIndex={-1}>Colony details</div>
  </div></MemoryRouter>,
}

export const OfflineMap: Story = {
  render: () => <ColonyMap data={publicMapData} mapStyleUrl={`data:application/json,${encodeURIComponent(JSON.stringify({ version: 8, sources: {}, layers: [] }))}`} />,
  parameters: { docs: { description: { story: 'Fictional locations and an empty local map style avoid external tile requests. The production location buttons, map zoom controls, and selection feedback remain active.' } } },
}
