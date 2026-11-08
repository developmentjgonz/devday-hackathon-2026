import { useId, useRef, type ReactNode } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Text } from './typography'

/** Photo preview and actions for choosing, replacing, or removing an image. */
export function PhotoUpload({ label, preview, hasPhoto, disabled = false, loading = false, error, onChoose, onRemove, onClearError }: {
  label: string
  preview: ReactNode
  hasPhoto: boolean
  disabled?: boolean
  loading?: boolean
  error?: string
  onChoose: (file: File | undefined) => void
  onRemove: () => void
  onClearError: () => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const hintId = `${id}-hint`
  return <div className="grid gap-3">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex flex-wrap items-center gap-4">
      {preview}
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled} loading={loading} aria-describedby={hintId} onClick={() => input.current?.click()}><ImagePlus aria-hidden="true" />{hasPhoto ? 'Change photo' : 'Add photo'}</Button>
          {hasPhoto ? <Button type="button" size="sm" variant="ghost" disabled={disabled || loading} onClick={onRemove}>Remove photo</Button> : null}
        </div>
        <Text id={hintId} size="caption" tone="muted">JPEG, PNG, or WebP, up to 10 MB. Large photos are resized.</Text>
      </div>
    </div>
    <Input ref={input} id={id} hidden tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || loading} aria-describedby={hintId} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; onChoose(file) }} />
    {error ? <><Text role="alert" size="small" tone="danger">{error}</Text><div><Button type="button" size="sm" variant="outline" disabled={disabled || loading} onClick={onClearError}>Clear photo error</Button></div></> : null}
  </div>
}
