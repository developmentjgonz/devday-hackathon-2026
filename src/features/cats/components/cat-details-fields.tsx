import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { Textarea } from '@/components/ui/textarea'
import { Text } from '@/components/ui/typography'
import type { CatInput } from '../../../../shared/schemas/directory'
import { maxSourcePhotoBytes, preparePhoto } from '@/lib/photo'

export type CatDetailsDraft = { birthDate: string; birthDateEstimated: boolean; description: string; photo: CatInput['photo']; photoError: string; photoReading: boolean }
export function emptyCatDetails(): CatDetailsDraft { return { birthDate: '', birthDateEstimated: false, description: '', photo: undefined, photoError: '', photoReading: false } }

export function CatDetailsFields({ value, onChange, name, existingPhoto, disabled }: { value: CatDetailsDraft; onChange: (next: CatDetailsDraft) => void; name: string; existingPhoto?: string; disabled?: boolean }) {
  const dateId = useId()
  const estimatedId = useId()
  const descriptionId = useId()
  const photoId = useId()
  const photoUrl = value.photo === undefined ? existingPhoto : value.photo ? `data:${value.photo.mimeType};base64,${value.photo.data}` : undefined
  async function selectPhoto(file: File | undefined) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxSourcePhotoBytes || !file.size) {
      onChange({ ...value, photoError: 'Choose a JPEG, PNG, or WebP image of 10 MB or less.', photoReading: false })
      return
    }
    onChange({ ...value, photoError: '', photoReading: true })
    try {
      const photo = await preparePhoto(file)
      onChange({ ...value, photo, photoError: '', photoReading: false })
    } catch { onChange({ ...value, photoError: 'Could not read the photo. Try another image.', photoReading: false }) }
  }
  return <>
    <div className="grid gap-2"><Label htmlFor={dateId}>Birth date (optional)</Label><Input id={dateId} type="date" max={new Date().toLocaleDateString('en-CA')} disabled={disabled} value={value.birthDate} onChange={(event) => onChange({ ...value, birthDate: event.target.value, birthDateEstimated: event.target.value ? value.birthDateEstimated : false })} /></div>
    {value.birthDate ? <div className="flex items-center gap-3"><Checkbox id={estimatedId} disabled={disabled} checked={value.birthDateEstimated} onCheckedChange={(checked) => onChange({ ...value, birthDateEstimated: checked === true })} /><Label htmlFor={estimatedId}>This date is an estimate</Label></div> : null}
    <div className="grid gap-2"><Label htmlFor={descriptionId}>Details (optional)</Label><Textarea id={descriptionId} disabled={disabled} maxLength={2000} value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} placeholder="Markings, temperament, or other useful details" /></div>
    <div className="grid gap-3"><Label htmlFor={photoId}>Cat photo (optional)</Label><RecordAvatar name={name.trim() || 'Cat'} kind="cat" src={photoUrl} size="lg" />
      <Input id={photoId} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || value.photoReading} aria-describedby={`${photoId}-hint`} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void selectPhoto(file) }} />
      <Text id={`${photoId}-hint`} size="caption" tone="muted">JPEG, PNG, or WebP, up to 10 MB. Large photos are resized.</Text>
      {value.photoError ? <Text role="alert" size="small" tone="danger">{value.photoError}</Text> : null}
      {value.photoError ? <div><Button type="button" size="sm" variant="outline" disabled={disabled || value.photoReading} onClick={() => onChange({ ...value, photoError: '' })}>Clear photo error</Button></div> : null}
      {photoUrl ? <div><Button type="button" size="sm" variant="outline" disabled={disabled || value.photoReading} onClick={() => onChange({ ...value, photo: null, photoError: '' })}>Remove photo</Button></div> : null}
    </div>
  </>
}
