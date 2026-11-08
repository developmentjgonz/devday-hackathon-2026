import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { Textarea } from '@/components/ui/textarea'
import type { CatInput } from '../../../../shared/schemas/directory'
import { maxSourcePhotoBytes, preparePhoto } from '@/lib/photo'

export type CatDetailsDraft = { birthDate: string; birthDateEstimated: boolean; description: string; photo: CatInput['photo']; photoError: string; photoReading: boolean }
export function emptyCatDetails(): CatDetailsDraft { return { birthDate: '', birthDateEstimated: false, description: '', photo: undefined, photoError: '', photoReading: false } }

export function CatDetailsFields({ value, onChange, name, existingPhoto, disabled }: { value: CatDetailsDraft; onChange: (next: CatDetailsDraft) => void; name: string; existingPhoto?: string; disabled?: boolean }) {
  const dateId = useId()
  const estimatedId = useId()
  const descriptionId = useId()
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
    <PhotoUpload label="Cat photo (optional)" preview={<RecordAvatar name={name.trim() || 'Cat'} kind="cat" src={photoUrl} size="lg" />} hasPhoto={Boolean(photoUrl)} disabled={disabled} loading={value.photoReading} error={value.photoError} onChoose={(file) => void selectPhoto(file)} onRemove={() => onChange({ ...value, photo: null, photoError: '' })} onClearError={() => onChange({ ...value, photoError: '' })} />
  </>
}
