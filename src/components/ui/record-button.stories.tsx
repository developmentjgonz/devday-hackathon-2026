import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Layers } from 'lucide-react'
import { RecordButton } from './record-button'

const meta = {
  title: 'Actions/Record button', component: RecordButton,
  args: { title: 'North service area', description: '6–10 colonies · High activity', icon: <Layers aria-hidden="true" className="size-4" /> },
  argTypes: { icon: { control: false } },
  render: function Render(args) {
    const [selected, setSelected] = useState(false)
    return <div className="w-80 max-w-full"><RecordButton {...args} selected={args.selected ?? selected} onClick={() => setSelected((value) => !value)} /></div>
  },
} satisfies Meta<typeof RecordButton>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Selected: Story = { args: { selected: true } }
export const LongTitle: Story = { args: { title: 'North service area and neighboring community gardens' } }
