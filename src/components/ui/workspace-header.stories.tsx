import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Route, Routes } from 'react-router'
import { WorkspaceHeader } from './workspace-header'

const meta = {
  title: 'Navigation/Workspace header',
  component: WorkspaceHeader,
  args: { title: 'Reports' },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The sticky workspace header holds the single h1 at the left. Parent breadcrumbs are links; the current page has aria-current="page". Pass ancestors through breadcrumbs and page actions through actions. The production toolbar supplies notifications on the right. On phones, the workspace shell offsets the header below the sticky menu bar. Labels truncate when space is limited, while actions keep their width. Use route handle.breadcrumb for each workspace page; do not repeat the title or an introductory description in the page body. Drawer and dialog titles remain local to their overlays.' } },
  },
  decorators: [(Story) => <MemoryRouter initialEntries={['/app/reports/report']}><Routes>
    <Route path="/app/reports" element={<WorkspaceHeader title="Reports" />} />
    <Route path="/app/reports/report" element={<Story />} />
  </Routes></MemoryRouter>],
} satisfies Meta<typeof WorkspaceHeader>

export default meta
type Story = StoryObj<typeof meta>
export const PageName: Story = {}
export const NestedPath: Story = { args: { title: 'Injured cat near Canal Street', breadcrumbs: [{ label: 'Reports', to: '/app/reports' }] } }
export const LongPageName: Story = { args: { title: 'Follow-up care for the colony behind the community garden on Canal Street', breadcrumbs: [{ label: 'Reports', to: '/app/reports' }] } }
