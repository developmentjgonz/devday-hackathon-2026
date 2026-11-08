import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AttachmentUpload } from './attachment-upload'

function Preview({ compact = false, disabled = false }: { compact?: boolean; disabled?: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  return <div className="w-96 max-w-full"><AttachmentUpload files={files} onChange={setFiles} compact={compact} disabled={disabled} /></div>
}
const meta = { title: 'Forms/Attachment upload', component: Preview, parameters: { docs: { description: { component: 'Choose and remove up to five report attachments, 10 MB each. Supports photos, audio, PDF, text, Word, and CSV. Selected files have local previews; nothing is uploaded by this component. The compact variant fits inside a chat composer. Busy forms disable selection and removal. Preview object URLs are released when files change or the component unmounts.' } } } } satisfies Meta<typeof Preview>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Compact: Story = { args: { compact: true } }
export const Disabled: Story = { args: { disabled: true } }
