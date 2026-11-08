import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import { UserAvatar } from '@/components/ui/user-avatar'
import { maxSourcePhotoBytes, preparePhoto } from '@/lib/photo'
import type { ProfileInput } from '../../../../shared/schemas/auth'
import type { SessionUser } from '../../../../shared/types/auth'

type PhotoDraft = ProfileInput['photo']

export function ProfileScreen({ user, onSave }: { user: SessionUser; onSave: (profile: ProfileInput) => Promise<SessionUser> }) {
  const [savedUser, setSavedUser] = useState(user)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [photo, setPhoto] = useState<PhotoDraft>(undefined)
  const [photoError, setPhotoError] = useState('')
  const [photoReading, setPhotoReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const photoUrl = photo === undefined ? savedUser.avatarUrl : photo ? `data:${photo.mimeType};base64,${photo.data}` : undefined
  const changed = name !== savedUser.name || email !== savedUser.email || phone !== (savedUser.phone ?? '')
    || (photo !== undefined && (photo !== null || Boolean(savedUser.avatarUrl)))

  async function selectPhoto(file: File | undefined) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > maxSourcePhotoBytes) {
      setPhotoError('Choose a JPEG, PNG, or WebP image of 10 MB or less.')
      return
    }
    setPhotoError('')
    setPhotoReading(true)
    try {
      setPhoto(await preparePhoto(file))
    } catch {
      setPhotoError('Could not read the photo. Try another image.')
    } finally {
      setPhotoReading(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || photoReading || photoError || !changed) return
    setSaving(true)
    setError('')
    try {
      const updated = await onSave({ name, email, phone, photo })
      setSavedUser(updated)
      setName(updated.name)
      setEmail(updated.email)
      setPhone(updated.phone ?? '')
      setPhoto(undefined)
      toast.success('Profile saved')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="max-w-2xl space-y-6">
    <title>Profile · Mews</title>
    <div className="space-y-2">
      <Heading level={2} size="card">Your profile</Heading>
      <Text size="small" tone="muted">Update your photo and contact details for your team.</Text>
    </div>
    <Card><CardContent>
      <form onSubmit={submit} className="space-y-6">
        <PhotoUpload label="Profile photo (optional)" preview={<UserAvatar name={name.trim() || 'You'} src={photoUrl} size="lg" />} hasPhoto={Boolean(photoUrl)} disabled={saving} loading={photoReading} error={photoError} onChoose={(file) => void selectPhoto(file)} onRemove={() => { setPhoto(null); setPhotoError('') }} onClearError={() => setPhotoError('')} />
        <div className="grid gap-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input id="profile-name" autoComplete="name" required maxLength={120} disabled={saving} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" type="email" autoComplete="email" required maxLength={254} disabled={saving} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-phone">Phone (optional)</Label>
          <Input id="profile-phone" type="tel" autoComplete="tel" maxLength={40} disabled={saving} value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" loading={saving} disabled={!changed || photoReading || Boolean(photoError)}>Save changes</Button>
      </form>
    </CardContent></Card>
    {changed && !saving ? <DiscardOnNavigation warnBeforeUnload /> : null}
  </div>
}
