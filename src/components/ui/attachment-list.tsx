import { useState } from 'react'
import { Download, FileText, ImageOff, X } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { EmptyState } from './empty-state'
import { LoadingIndicator } from './loading-indicator'
import { Text } from './typography'

export type Attachment = { id: string; name: string; url: string; mimeType: string; size: number }
type AttachmentListProps = {
  attachments: Attachment[]
  display?: 'preview' | 'compact'
  onRemove?: (attachment: Attachment) => void
  onOpenPhoto?: (attachment: Attachment) => void
}

function formatSize(size: number) {
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`
}

function PhotoPreview({ attachment, onOpen }: { attachment: Attachment; onOpen?: (attachment: Attachment) => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  if (state === 'error') return <EmptyState title="Photo preview unavailable" icon={<ImageOff />} action={<Button variant="outline" render={<a href={attachment.url} target="_blank" rel="noreferrer" />}>Open original</Button>} />
  const photo = <img src={attachment.url} alt={attachment.name} className="max-h-64 w-full object-contain" onLoad={() => setState('ready')} onError={() => setState('error')} />
  return <div className="relative flex h-64 items-center justify-center" aria-busy={state === 'loading'}>
    {onOpen ? <Button variant="media" size="media" className="w-full" onClick={() => onOpen(attachment)} aria-label={`Open photo ${attachment.name}`}>{photo}</Button> : photo}
    {state === 'loading' ? <div className="pointer-events-none absolute inset-0 grid place-items-center"><LoadingIndicator size="sm" label={`Loading ${attachment.name}`} /></div> : null}
  </div>
}

/** Full photo previews for review; compact rows for file selection and upload forms. */
export function AttachmentList({ attachments, display = 'preview', onRemove, onOpenPhoto }: AttachmentListProps) {
  return <ul className="grid min-w-0 gap-3" aria-label="Attachments">
    {attachments.map((attachment) => {
      const image = attachment.mimeType.startsWith('image/')
      const preview = image && display === 'preview'
      return <li key={`${attachment.id}-${attachment.url}`} className="min-w-0"><Card padding="none" size="sm">
        {preview ? <PhotoPreview attachment={attachment} onOpen={onOpenPhoto} /> : null}
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            {!preview ? image ? onOpenPhoto ? <Button variant="media" size="media" onClick={() => onOpenPhoto(attachment)} aria-label={`Open photo ${attachment.name}`}><img src={attachment.url} alt={attachment.name} className="size-16 object-cover" /></Button> : <img src={attachment.url} alt={attachment.name} className="size-16 rounded-control object-cover" /> : <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
            <div className="min-w-0 flex-1"><Text size="small" className="wrap-anywhere">{attachment.name}</Text><Text size="caption" tone="muted">{formatSize(attachment.size)}</Text></div>
            {onRemove ? <Button variant="ghost" size="icon" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment)}><X aria-hidden="true" /></Button> : <Button variant="ghost" size="icon" render={<a href={attachment.url} download={attachment.name} target="_blank" rel="noreferrer" />} aria-label={`Download ${attachment.name}`}><Download aria-hidden="true" /></Button>}
          </div>
          {!onRemove && attachment.mimeType.startsWith('audio/') ? <audio controls preload="none" src={attachment.url} aria-label={`Play ${attachment.name}`} className="w-full min-w-0" /> : null}
          {!onRemove && !image && !attachment.mimeType.startsWith('audio/') ? <Button variant="link" size="sm" render={<a href={attachment.url} target="_blank" rel="noreferrer" />}>Open file</Button> : null}
        </CardContent>
      </Card></li>
    })}
  </ul>
}
