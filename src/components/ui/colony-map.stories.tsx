import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ColonyMap } from './colony-map'
import { Button } from './button'
import { publicMapData } from '@/stories/fixtures/public-map-data'
import { teamMapData } from '@/stories/fixtures/team-map-data'

function UpdatesPreview() {
  const [updated, setUpdated] = useState(false)
  const data = updated
    ? {
        ...teamMapData,
        colonies: teamMapData.colonies.map((colony, index) =>
          index === 0 ? { ...colony, status: 'needs-visit' as const } : colony,
        ),
      }
    : teamMapData
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() => setUpdated((previous) => !previous)}
      >
        {updated ? 'Reset sample update' : 'Simulate care update'}
      </Button>
      <ColonyMap data={data} />
    </div>
  )
}
function RetryPreview() {
  const [failed, setFailed] = useState(true)
  return (
    <ColonyMap
      data={publicMapData}
      state={failed ? 'error' : 'ready'}
      onRetry={() => setFailed(false)}
    />
  )
}

const meta = {
  title: 'Display/Colony map',
  component: ColonyMap,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Production component with fictional Storybook fixtures. Names, counts, and positions are sample data. Live feeds and server authorization are not connected. Public location protection must be applied by the server before this component receives data.',
      },
    },
  },
  args: {
    data: publicMapData,
    state: 'ready',
    title: 'Colony map',
  },
  argTypes: {
    data: { control: false },
    state: { control: 'select', options: ['ready', 'loading', 'error'] },
  },
} satisfies Meta<typeof ColonyMap>
export default meta
type Story = StoryObj<typeof meta>
export const PublicAreas: Story = {
  name: 'Public areas · Approximate',
  parameters: {
    docs: {
      description: {
        story:
          'Receives authored area summaries only. The heatmap uses area centers, not colony positions. This is a UI demonstration, not a server privacy implementation.',
      },
    },
  },
}
export const TeamColonies: Story = {
  name: 'Team colonies',
  args: { data: teamMapData },
}
export const Loading: Story = { args: { state: 'loading' } }
export const Empty: Story = {
  args: { data: { audience: 'public', areas: [] } },
}
export const Error: Story = { render: () => <RetryPreview /> }
export const Updates: Story = { render: () => <UpdatesPreview /> }
