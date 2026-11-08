import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecordAvatar } from './record-avatar'

const meta = {
  title: 'Display/Record avatar', component: RecordAvatar,
  parameters: { docs: { description: { component: 'A shared cat or colony photo with a soft pink fallback. Sizes are 40, 56, and 80 pixels. An unavailable photo returns to the same fallback. The photo shown here is a stock image used only in fictional fixtures; real uploads require private storage.' } } },
  args: { name: 'Pepper', kind: 'cat' },
} satisfies Meta<typeof RecordAvatar>
export default meta
type Story = StoryObj<typeof meta>
export const CatFallback: Story = {}
export const ColonyFallback: Story = { args: { name: 'Riverside', kind: 'colony' } }
export const CatPhoto: Story = { args: { src: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80', size: 'lg' } }
