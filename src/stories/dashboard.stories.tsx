import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { LandingPage } from '@/features/landing/pages/landing-page'
import { SiteLayout } from '@/components/layout/site-layout'
import type { SessionUser } from '../../shared/types/auth'

const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }
function DashboardStory() {
  const [router] = useState(() => createMemoryRouter([
    { path: '/app', id: 'workspace', loader: () => user, Component: OverviewPage },
    { path: '/', Component: SiteLayout, children: [{ index: true, Component: LandingPage }] },
  ], { initialEntries: ['/app'] }))
  return <div className="mx-auto max-w-6xl px-6 py-10"><RouterProvider router={router} /></div>
}
const meta = {
  title: 'Pages/Dashboard',
  component: DashboardStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production overview uses the shared PageHeader, Heading, and Text components. This story supplies a fictional signed-in user. It does not create colony records, report invented activity, or make account requests.' } } },
} satisfies Meta<typeof DashboardStory>
export default meta
type Story = StoryObj<typeof meta>
export const Overview: Story = {}
