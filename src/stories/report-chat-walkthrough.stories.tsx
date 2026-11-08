import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReportChatStage } from './stageshow/report-chat'
import { ReportFormStage } from './stageshow/report-form'
const meta = { title: 'Demos/Report chat', component: ReportChatStage, parameters: { layout: 'centered', docs: { description: { component: 'An isolated Stageshow illustration of confirmation and filing. It uses the shared Mews controls and sends no network requests. The public report chat is the functional flow.' } } } } satisfies Meta<typeof ReportChatStage>
export default meta
type Story = StoryObj<typeof meta>
export const Walkthrough: Story = {}

export const ClassicForm: Story = { render: () => <ReportFormStage /> }
