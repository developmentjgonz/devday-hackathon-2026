import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AttachmentList, type Attachment } from './attachment-list'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'
import { EmptyState } from './empty-state'
import { FileText } from 'lucide-react'

const photo: Attachment = { id: 'cat-photo', name: 'cat-sighting.jpg', mimeType: 'image/jpeg', size: 66221, url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80' }
const note: Attachment = { id: 'visit-note', name: 'visit-notes.txt', mimeType: 'text/plain', size: 83, url: 'data:text/plain;charset=utf-8,Morning%20visit%20complete.%20Fresh%20water%20provided.' }
function Example({ attachments = [photo], compact = false }: { attachments?: Attachment[]; compact?: boolean }) {
  const [items, setItems] = useState(attachments)
  const [opened, setOpened] = useState<Attachment | null>(null)
  return <div className="w-full max-w-xl">
    {items.length ? <AttachmentList attachments={items} display={compact ? 'compact' : 'preview'} onOpenPhoto={setOpened} onRemove={compact ? (item) => setItems((items) => items.filter((candidate) => candidate.id !== item.id)) : undefined} /> : <EmptyState title="No attachments" icon={<FileText />} />}
    <Dialog open={opened !== null} onOpenChange={(open) => { if (!open) setOpened(null) }}><DialogContent size="wide"><DialogHeader><DialogTitle>Attachment photo</DialogTitle><DialogDescription>{opened?.name}</DialogDescription></DialogHeader>{opened ? <img src={opened.url} alt={opened.name} className="max-h-[65dvh] w-full object-contain" /> : null}</DialogContent></Dialog>
  </div>
}
const meta = {
  title: 'Display/Attachments',
  component: Example,
  parameters: { layout: 'padded', docs: { description: { component: 'Preview mode shows complete photos without cropping, an accessible loading state, file names, sizes, downloads, and native audio controls. Photos open in a wide shared Dialog. Other files have Open file links. Compact mode supports removal during report submission. A failed photo uses EmptyState with an Open original link. The photo is a stock Unsplash image. Files are local examples; no uploads occur.' } } },
} satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const PhotoPreview: Story = {}
export const CompactSelection: Story = { args: { compact: true, attachments: [photo, note] } }
export const MixedFiles: Story = { args: { attachments: [photo, note, { id: 'audio', name: 'voice-note.wav', mimeType: 'audio/wav', size: 46, url: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==' }] } }
export const UnavailablePhoto: Story = { args: { attachments: [{ ...photo, url: 'data:image/png;base64,broken' }] } }
export const LongFileName: Story = { args: { attachments: [{ ...note, name: 'Feeding-visit-notes-for-the-colony-near-the-north-parking-lot-2026-11-07.txt' }] } }
