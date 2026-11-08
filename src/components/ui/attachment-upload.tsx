import { useEffect, useId, useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { attachmentAccept, attachmentError, attachmentType } from '../../../shared/attachments'
import { Alert } from './alert'
import { AttachmentList, type Attachment } from './attachment-list'
import { Button } from './button'
import { Input } from './input'
import { Text } from './typography'

/** Shared report file selection. Object URLs belong to the preview, not the file state. */
export function AttachmentUpload({ files, onChange, disabled = false, compact = false }: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  compact?: boolean
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [previews, setPreviews] = useState<Attachment[]>([])
  useEffect(() => {
    const items = files.map((file, index) => ({ id: String(index), name: file.name, mimeType: attachmentType(file) ?? file.type, size: file.size, url: URL.createObjectURL(file) }))
    setPreviews(items)
    return () => items.forEach((item) => URL.revokeObjectURL(item.url))
  }, [files])

  return <div className="min-w-0 space-y-3">
    {previews.length ? <div className="max-h-48 overflow-y-auto overscroll-contain"><AttachmentList display="compact" attachments={previews} onRemove={disabled ? undefined : (attachment) => { onChange(files.filter((_, index) => String(index) !== attachment.id)); setError('') }} /></div> : null}
    <div className="flex flex-wrap items-center gap-2">
      <Input ref={input} id={id} aria-label="Photos and attachments" aria-describedby={`${id}-help`} type="file" hidden multiple accept={attachmentAccept} disabled={disabled} onChange={(event) => {
        const added = Array.from(event.target.files ?? [])
        event.target.value = ''
        if (!added.length) return
        const next = [...files, ...added]
        const problem = attachmentError(next)
        setError(problem)
        if (!problem) onChange(next)
      }} />
      <Button type="button" variant={compact ? 'ghost' : 'outline'} size={compact ? 'icon' : 'sm'} disabled={disabled} onClick={() => input.current?.click()} aria-label="Add photos or attachments" aria-describedby={`${id}-help`}><Paperclip aria-hidden="true" />{compact ? null : 'Add photos or attachments'}</Button>
      <Text id={`${id}-help`} size="caption" tone="muted">{files.length ? `${files.length} of 5 files · ` : ''}Up to 5 files, 10 MB each.</Text>
    </div>
    {error ? <Alert>{error}</Alert> : null}
  </div>
}
