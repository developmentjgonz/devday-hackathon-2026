import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router'
import { NavigationPending } from '@/components/layout/navigation-pending'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { RouteLoadingPage } from '@/pages/route-loading-page'
import { PawLoadingStage } from './stageshow/paw-loading'
import { waitForStoryRequest } from './fixtures/controlled-request'

function ExamplePage({ title }: { title: string }) {
  return <main className="space-y-4 p-6">
    <Heading level={1} size="title">{title}</Heading>
    <div className="flex flex-wrap gap-3">
      <Button render={<Link to="/slow" />}>Open slow page</Button>
      <Button variant="outline" render={<Link to="/fast" />}>Open fast page</Button>
    </div>
  </main>
}

function ExampleLayout() {
  return <><Outlet /><NavigationPending /></>
}

function NavigationLoadingStory() {
  const [router] = useState(() => createMemoryRouter([{
    path: '/', Component: ExampleLayout, children: [
      { index: true, element: <ExamplePage title="Starting page" /> },
      { path: 'fast', element: <ExamplePage title="Fast page" /> },
      { path: 'slow', loader: ({ request }) => waitForStoryRequest('storybook:release-navigation', request.signal), element: <ExamplePage title="Slow page" /> },
    ],
  }]))
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Feedback/Navigation loading',
  component: NavigationLoadingStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production route feedback uses the shared loading toast after a short wait. The isolated slow route waits up to 30 seconds for inspection; tests can release it sooner. The fast route and cancelled navigation show how the feedback clears.' } } },
} satisfies Meta<typeof NavigationLoadingStory>
export default meta
type Story = StoryObj<typeof meta>
export const RouteTransitions: Story = {}
export const RouteFallback: Story = {
  render: () => <RouteLoadingPage />,
  parameters: { docs: { description: { story: 'The centered paw shown while the app opens.' } } },
}
export const PawInWindow: Story = {
  render: () => <PawLoadingStage />,
  parameters: { docs: { description: { story: 'A Stageshow view of the opening paw inside a browser window.' } } },
}
