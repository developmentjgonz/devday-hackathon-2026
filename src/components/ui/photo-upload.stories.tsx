import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PhotoUpload } from './photo-upload'
import { RecordAvatar } from './record-avatar'

function PhotoUploadPreview({ initialPhoto = false, loading = false, initialError = '' }: { initialPhoto?: boolean; loading?: boolean; initialError?: string }) {
  const [photo, setPhoto] = useState<string | undefined>(() => initialPhoto ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80' : undefined)
  const [error, setError] = useState(initialError)
  useEffect(() => () => { if (photo?.startsWith('blob:')) URL.revokeObjectURL(photo) }, [photo])
  return <div className="max-w-lg"><PhotoUpload label="Cat photo (optional)" preview={<RecordAvatar kind="cat" name="Poppy" src={photo} size="lg" />} hasPhoto={Boolean(photo)} loading={loading} error={error} onChoose={(file) => { if (file) { setError(''); setPhoto(URL.createObjectURL(file)) } }} onRemove={() => setPhoto(undefined)} onClearError={() => setError('')} /></div>
}

const meta = {
  title: 'Forms/Photo upload',
  component: PhotoUploadPreview,
  parameters: { docs: { description: { component: 'A photo preview with shared actions to choose, replace, or remove an image. The form validates and prepares the selected file. The Storybook preview stays in the browser.' } } },
} satisfies Meta<typeof PhotoUploadPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const WithPhoto: Story = { args: { initialPhoto: true } }
export const Loading: Story = { args: { loading: true } }
export const Error: Story = { args: { initialError: 'Choose a JPEG, PNG, or WebP image of 10 MB or less.' } }
