import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { DialogDescription, DialogTitle } from './dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from './discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextField, DrawerContextValue, DrawerFooter, DrawerHeader } from './drawer'
import { Input } from './input'
import { Label } from './label'
import { SelectField } from './select-field'
import { Text } from './typography'
function Example({ density = 'default', motion = 'default', editable = false }: { density?: 'default' | 'compact'; motion?: 'default' | 'none'; editable?: boolean }) {
  const [open, setOpen] = useState(false)
  const [colony, setColony] = useState('canal')
  const [cat, setCat] = useState('miso')
  return <><Button onClick={() => setOpen(true)}>Review report</Button><Drawer open={open} onOpenChange={setOpen}><DrawerContent motion={motion}><DrawerHeader density={density} className="pr-6"><DialogTitle size={density === 'compact' ? 'card' : 'section'} className="flex min-h-11 items-center pr-10">Report</DialogTitle><DialogDescription className="sr-only">Morning feeding complete, reported by Maya Rivera.</DialogDescription><DrawerContext>{editable ? <>
    <DrawerContextField><Label htmlFor="drawer-example-colony">Colony</Label><SelectField id="drawer-example-colony" value={colony} onChange={(event) => { setColony(event.target.value); setCat('') }}><option value="">Colony unknown</option><option value="canal">Canal</option><option value="riverside">Riverside</option></SelectField></DrawerContextField>
    <DrawerContextField><Label htmlFor="drawer-example-cat">Cat (optional)</Label><SelectField id="drawer-example-cat" value={cat} onChange={(event) => setCat(event.target.value)}><option value="">Unconfirmed</option>{colony === 'canal' ? <option value="miso">Miso</option> : null}</SelectField></DrawerContextField>
  </> : <><DrawerContextValue label="Colony" value="Canal" /><DrawerContextValue label="Cat" value="Miso" /></>}</DrawerContext></DrawerHeader><DrawerBody><Text weight="medium">Morning feeding complete</Text><Text>The original report and review fields appear here.</Text></DrawerBody><DrawerFooter><Button onClick={() => setOpen(false)}>Finish review</Button></DrawerFooter></DrawerContent></Drawer></>
}
const meta = { title: 'Overlays/Drawer', component: Example, parameters: { docs: { description: { component: 'Use drawers for record details and editing. A right-side Base UI modal panel traps focus, supports Escape, and returns focus after closing. The body scrolls independently, while the header and footer stay visible. The default panel fills phone screens; size="navigation" leaves a visible backdrop beside the menu. DrawerFooter defaults to action buttons, with the primary action on the right on wide screens and on top on phones; use layout="stack" for other footer content. Header and close-button spacing respect the top safe area; the footer respects the bottom safe area. Use closeDisabled with controlled onOpenChange during a save. Use a centered dialog for short decisions, and preserve or confirm before discarding form changes.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const RightPanel: Story = {}
export const CompactHeader: Story = { args: { density: 'compact' }, parameters: { docs: { description: { story: 'DrawerHeader density="compact" reduces header padding and spacing while preserving safe areas and room for the close control. DialogTitle size="card" uses the shared heading scale for a compact record title.' } } } }
export const EditableContext: Story = { args: { density: 'compact', editable: true }, parameters: { docs: { description: { story: 'DrawerContext keeps colony and optional cat fields in the fixed header. DrawerContextField contains shared labels and controls; DrawerContextValue displays read-only context. Use values for linked records that are edited elsewhere, including tasks with several links. Set maxLines={2} for a long summary only when the complete list is available elsewhere in the drawer.' } } } }
export const WithoutMotion: Story = { args: { motion: 'none' }, parameters: { docs: { description: { story: 'DrawerContent motion="none" keeps the panel and backdrop still during an immediate handoff between related views.' } } } }

function EditingExample() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const discard = useDiscardConfirmation(open && name !== '')
  function close() { discard.requestDiscard(() => setOpen(false)) }
  return <><Button onClick={() => { setName(''); setOpen(true) }}>Add cat</Button>
    <Drawer open={open} onOpenChange={(next, event) => { if (!next) { if (name) event.cancel(); close() } }}><DrawerContent render={<form onSubmit={(event) => { event.preventDefault(); setOpen(false) }} />}>
      <DrawerHeader><DialogTitle>Add cat</DialogTitle><DialogDescription>Add a cat to the colony.</DialogDescription></DrawerHeader>
      <DrawerBody><div className="grid gap-2"><Label htmlFor="example-cat-name">Cat name</Label><Input id="example-cat-name" value={name} onChange={(event) => setName(event.target.value)} /></div></DrawerBody>
      <DrawerFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={!name}>Add cat</Button></DrawerFooter>
      <DiscardChangesDialog {...discard.dialogProps} />
    </DrawerContent></Drawer>
  </>
}
export const UnsavedChanges: Story = {
  render: () => <EditingExample />,
  parameters: { docs: { description: { story: 'Use useDiscardConfirmation and DiscardChangesDialog when closing a form would lose changes. Route Cancel, Escape, the close control, and outside presses through requestDiscard. The confirmation starts on Keep editing and the hook also warns before the browser unloads. In workspace forms, mount DiscardOnNavigation while the form has unsaved changes to protect in-app navigation.' } } },
}
