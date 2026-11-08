import { Download, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/ui/typography'
import type { ReportAttachment } from '../types'

export function ReportAttachments({ attachments, onRemove, onOpenPhoto }: { attachments: ReportAttachment[]; onRemove?: (attachment: ReportAttachment) => void; onOpenPhoto?: (attachment: ReportAttachment) => void }) {
  return <ul className="grid gap-3" aria-label="Attachments">
    {attachments.map((attachment) => <li key={attachment.id}><Card size="sm"><CardContent className="space-y-3">
      <div className="flex items-center gap-3">
        {attachment.mimeType.startsWith('image/') ? onOpenPhoto ? <Button variant="media" size="media" onClick={() => onOpenPhoto(attachment)} aria-label={`Open photo ${attachment.name}`}><img src={attachment.url} alt={attachment.name} className="size-16 object-cover" /></Button> : <img src={attachment.url} alt={attachment.name} className="size-16 rounded-control object-cover" /> : <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0 flex-1"><Text size="small" className="truncate">{attachment.name}</Text><Text size="caption" tone="muted">{attachment.size >= 1024 * 1024 ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(attachment.size / 1024))} KB`}</Text></div>
        {onRemove ? <Button variant="ghost" size="icon" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment)}><X aria-hidden="true" /></Button> : <Button variant="ghost" size="icon" render={<a href={attachment.url} download={attachment.name} target="_blank" rel="noreferrer" />} aria-label={`Download ${attachment.name}`}><Download aria-hidden="true" /></Button>}
      </div>
      {!onRemove && attachment.mimeType.startsWith('audio/') ? <audio controls preload="none" src={attachment.url} aria-label={`Play ${attachment.name}`} className="w-full" /> : null}
    </CardContent></Card></li>)}
  </ul>
}
