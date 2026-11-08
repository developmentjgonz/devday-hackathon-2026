import { useState, type FormEvent } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChatComposer } from './chat-composer'
import { AttachmentUpload } from './attachment-upload'

function ComposerPreview({ loading = false, layout = 'stacked' }: { loading?: boolean; layout?: 'stacked' | 'inline' }) {
  const [value, setValue] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setValue('') }
  return <div className="w-96 max-w-full"><ChatComposer value={value} onChange={setValue} onSubmit={submit} loading={loading} layout={layout} /></div>
}

const meta = {
  title: 'Forms/Chat composer', component: ComposerPreview,
  parameters: { docs: { description: { component: 'A message field and send action for conversations. Enter sends, Shift + Enter adds a line, and the shared button shows the loading state. Focus is shown with a subtle border around the whole composer. Pending replies make the field read-only rather than disabled, so focus stays in the field. The example keeps text only in memory.' } } },
} satisfies Meta<typeof ComposerPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Sending: Story = { args: { loading: true } }
export const Inline: Story = { args: { layout: 'inline' } }

export const WithAttachments: Story = {
  render: () => <AttachmentComposer />,
  parameters: { docs: { description: { story: 'Use the actions slot for the shared AttachmentUpload control. File previews, removal, and validation stay in the composer. Files are held in memory until the enclosing report is submitted.' } } },
}

function AttachmentComposer() {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<File[]>([])
  return <div className="w-96 max-w-full"><ChatComposer value={value} onChange={setValue} onSubmit={(event) => { event.preventDefault(); setValue('') }} actions={<AttachmentUpload compact files={files} onChange={setFiles} />} /></div>
}
