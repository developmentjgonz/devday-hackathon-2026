import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

function CardPreview() {
  const [saved, setSaved] = useState(false)
  return (
    <Card className="w-80 max-w-full">
      <CardHeader>
        <CardTitle><h2>A reusable content card</h2></CardTitle>
        <CardDescription>Group related content and an action.</CardDescription>
      </CardHeader>
      <CardContent><p className="text-muted-foreground">A shared component example with temporary preview state.</p></CardContent>
      <CardFooter className="justify-between gap-3">
        <span role="status" className="text-xs text-muted-foreground">{saved ? 'Saved for this preview' : 'Example content'}</span>
        <Button variant="outline" onClick={() => setSaved((previous) => !previous)}>{saved ? 'Saved' : 'Save example'}</Button>
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
