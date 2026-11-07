import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

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
        <Button variant="outline" disabled={saved} onClick={() => setSaved(true)}>{saved ? 'Logged' : 'Log visit'}</Button>
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
