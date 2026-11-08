import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'
import { Table, TableCell, TableHead, TableOpenButton, TableRow } from './table'
const meta = { title: 'Display/Table', component: Table, decorators: [(Story) => <div className="w-full max-w-2xl"><Story /></div>], render: () => <Table><caption className="sr-only">Care reports</caption><thead><tr><TableHead>Report</TableHead><TableHead>Review signal</TableHead></tr></thead><tbody><TableRow interactive><TableCell><TableOpenButton>Possible injury at Riverside</TableOpenButton></TableCell><TableCell><Badge variant="destructive">Urgent</Badge></TableCell></TableRow><TableRow interactive selected><TableCell><TableOpenButton>Morning feeding complete</TableOpenButton></TableCell><TableCell><Badge variant="outline">Ready to review</Badge></TableCell></TableRow></tbody></Table>, parameters: { docs: { description: { component: 'Compact semantic table. Interactive rows contain a native TableOpenButton for keyboard access. Selected state and hover belong to the shared row. Pages may control column widths and responsive visibility.' } } } } satisfies Meta<typeof Table>
export default meta
type Story = StoryObj<typeof meta>
export const Reports: Story = {}
export const Compact: Story = { render: () => <Table density="compact"><thead><tr><TableHead>Report</TableHead><TableHead>Review</TableHead></tr></thead><tbody><TableRow interactive><TableCell><TableOpenButton>Possible injury at Riverside</TableOpenButton></TableCell><TableCell>Needs care check</TableCell></TableRow></tbody></Table> }
