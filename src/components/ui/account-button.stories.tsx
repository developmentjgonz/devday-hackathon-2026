import { userPortraitUrl } from '../../../seeds/user-portraits'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccountButton } from './account-button'

const meta = {
  title: 'Actions/Account button', component: AccountButton,
  args: { name: 'Maya Rivera', description: 'Administrator', 'aria-label': 'Account options for Maya Rivera' },
  decorators: [(Story) => <div className="w-60"><Story /></div>],
  parameters: { docs: { description: { component: 'The production account trigger. Pass avatarUrl for a photo; initials appear when it is absent or unavailable. Avatar, typography, active state, focus ring, and spacing belong to this shared component. Compose it with PopoverTrigger for an account menu.' } } },
} satisfies Meta<typeof AccountButton>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongName: Story = { args: { name: 'Alexandria Morgan-Rivera', description: 'Rescue administrator' } }

export const Photo: Story = { args: { avatarUrl: userPortraitUrl('Maya Rivera') } }
