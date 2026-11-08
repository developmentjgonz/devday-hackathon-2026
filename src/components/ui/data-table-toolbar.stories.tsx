import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataTableToolbar } from './data-table-toolbar'
import { Button } from './button'

function ToolbarExample({ selected = false, filterPresentation = 'inline' }: { selected?: boolean; filterPresentation?: 'inline' | 'popover' }) {
  const [search, setSearch] = useState('')
  const [colony, setColony] = useState('all')
  const [status, setStatus] = useState('pending')
  const [count, setCount] = useState(selected ? 2 : 0)
  return <DataTableToolbar
    search={{ label: 'Search reports', placeholder: 'Search reports…', value: search, onValueChange: setSearch }}
    filterPresentation={filterPresentation}
    filters={[
      { id: 'status', label: 'Filter by status', displayLabel: 'Status', value: status, active: status !== 'all', width: 'wide', onValueChange: setStatus, options: [{ value: 'all', label: 'All reports' }, { value: 'pending', label: 'Needs review' }, { value: 'waiting', label: 'Waiting for details' }, { value: 'processed', label: 'Reviewed' }] },
      { id: 'colony', label: 'Filter by colony', displayLabel: 'Colony', value: colony, active: colony !== 'all', onValueChange: setColony, options: [{ value: 'all', label: 'All colonies' }, { value: 'canal', label: 'Canal' }, { value: 'riverside', label: 'Riverside' }] },
    ]}
    onReset={() => { if (filterPresentation === 'inline') setSearch(''); setColony('all'); setStatus('all') }}
    resetActive={Boolean((filterPresentation === 'inline' && search) || colony !== 'all' || status !== 'all')}
    selection={{ count, actions: <Button variant="outline" size="sm" onClick={() => setCount(0)}>Remove selected</Button>, onClear: () => setCount(0) }}
  />
}

const meta = {
  title: 'Display/Data table toolbar', component: ToolbarExample,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'A compact toolbar above a DataTable. Inline filters use the wide width for longer values and keep the reset position stable. The popover presentation groups filters behind one button, shows the active count and values, and leaves search separate when filters are cleared. Supply displayLabel and active for each popover filter, plus onReset and resetActive for its clear action. The actions slot places page actions at the right edge. During selection, filters are disabled and the search and actions slots show the selection controls. Input and SelectField use the shared controlSize="sm" API.' } } },
} satisfies Meta<typeof ToolbarExample>
export default meta
type Story = StoryObj<typeof meta>
export const SearchAndFilter: Story = {}
export const PopoverFilters: Story = { args: { filterPresentation: 'popover' } }
export const Selection: Story = { args: { selected: true } }
