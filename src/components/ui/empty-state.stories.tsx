import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClipboardList, CircleAlert, Search, FileQuestion } from 'lucide-react'
import { CatPawPrint } from '@/components/brand-assets'
import { SadCat } from '@/components/illustrations/sad-cat'
import { EmptyState } from './empty-state'
import { Button } from './button'

const meta = {
  title: 'Feedback/Empty state',
  component: EmptyState,
  args: { title: 'No colonies yet', icon: <CatPawPrint /> },
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const Visits: Story = { args: { title: 'No visits to show', icon: <ClipboardList aria-hidden="true" /> } }
export const NoResults: Story = { args: { title: 'No matching reports', description: 'Try another search or colony.', icon: <Search />, action: <Button variant="outline">Clear filters</Button> } }
export const Error: Story = { args: { title: 'Could not load the map', description: 'Check your connection and retry.', icon: <CircleAlert />, tone: 'danger', role: 'alert', action: <Button variant="outline">Retry map</Button> } }
export const PageNotFound: Story = { args: { title: 'Page not found', description: 'Check the address or return to the overview.', icon: <FileQuestion />, size: 'page', headingLevel: 1 } }
export const IllustratedError: Story = {
  render: () => <EmptyState title="Something went wrong" description="We could not display this page. Reload it to try again." illustration={<SadCat />} tone="danger" size="page" headingLevel={1} action={<Button>Reload page</Button>} />,
  parameters: { docs: { description: { story: 'Use the illustration prop in place of icon for a larger decorative image on recovery pages. The empty state provides the backdrop and hides the image from assistive technology.' } } },
}
