import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, ButtonLabel } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardList } from './card'
import { Heading, Text } from './typography'
import { Separator } from './separator'

function CardPreview() {
  const [saved, setSaved] = useState(false)
  return (
    <Card className="w-80 max-w-full">
      <CardHeader>
        <CardTitle><h2>Canal colony</h2></CardTitle>
        <CardDescription>8 cats · Morning feeding</CardDescription>
      </CardHeader>
      <CardContent><p className="text-muted-foreground">8 cats seen. Food and water bowls refilled. Miso and Pepper were both present.</p></CardContent>
      <CardFooter className="justify-between gap-3">
        <span role="status" className="text-xs text-muted-foreground">{saved ? 'Visit logged' : 'Visit not logged'}</span>
        <Button variant="outline" disabled={saved} onClick={() => setSaved(true)}><ButtonLabel labels={['Log visit', 'Logged']}>{saved ? 'Logged' : 'Log visit'}</ButtonLabel></Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: 'Display/Card',
  component: Card,
  render: () => <CardPreview />,
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>
export const WithAction: Story = {}
export const EdgeToEdgeList: Story = {
  render: () => <Card padding="none" className="w-80 max-w-full"><CardHeader className="py-6"><Heading size="card">Care updates</Heading></CardHeader><Separator /><CardList>{['Fresh water added', 'Morning feeding complete'].map((update) => <li key={update} className="px-6 py-4"><Text size="small">{update}</Text></li>)}</CardList></Card>,
}
