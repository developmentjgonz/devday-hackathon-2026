import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataTableToolbar } from './data-table-toolbar'
import { Button } from './button'

function ToolbarExample({ selected = false }: { selected?: boolean }) {
  const [search, setSearch] = useState('')
  const [colony, setColony] = useState('all')
  const [status, setStatus] = useState('pending')
  const [count, setCount] = useState(selected ? 2 : 0)
  return <DataTableToolbar
    search={{ label: 'Search reports', placeholder: 'Search reports…', value: search, onValueChange: setSearch }}
    filters={[
      { id: 'status', label: 'Filter by status', value: status, width: 'wide', onValueChange: setStatus, options: [{ value: 'all', label: 'All reports' }, { value: 'pending', label: 'Needs review' }, { value: 'waiting', label: 'Waiting for details' }, { value: 'processed', label: 'Reviewed' }] },
      { id: 'colony', label: 'Filter by colony', value: colony, onValueChange: setColony, options: [{ value: 'all', label: 'All colonies' }, { value: 'canal', label: 'Canal' }, { value: 'riverside', label: 'Riverside' }] },
    ]}
    onReset={() => { setSearch(''); setColony('all'); setStatus('all') }}
    resetActive={Boolean(search || colony !== 'all' || status !== 'all')}
    selection={{ count, actions: <Button variant="outline" size="sm" onClick={() => setCount(0)}>Remove selected</Button>, onClear: () => setCount(0) }}
  />
}

const meta = {
  title: 'Display/Data table toolbar', component: ToolbarExample,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'One compact toolbar directly above DataTable. Search, Status, and Colony stay together outside the table border. The toolbar has no enclosing box or bottom divider; spacing connects it to the table. Status starts at Needs review; All reports removes the status restriction. Clear filters restores all records and clears search and colony filtering. Pass onReset and resetActive together to keep space for the reset action when it is inactive. The actions slot places a page action at the right edge. When rows are selected, the search and page action positions show their count and bulk actions; filters remain visible but disabled and the table stays in place. The isolated story demonstrates controlled fields; Pages/Inbox supplies the actual filtering and review workflow. Input and SelectField use their shared controlSize="sm" API. Labels, focus, native select behavior, and phone input text sizes remain intact.' } } },
} satisfies Meta<typeof ToolbarExample>
export default meta
type Story = StoryObj<typeof meta>
export const SearchAndFilter: Story = {}
export const Selection: Story = { args: { selected: true } }
