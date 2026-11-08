import { z } from 'zod'

const name = z.string('Enter a name with 1 to 120 characters').trim()
  .min(1, 'Enter a name with 1 to 120 characters').max(120, 'Enter a name with 1 to 120 characters')

export const catPhotoMaxBytes = 1024 * 1024
const photoSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.string().max(Math.ceil(catPhotoMaxBytes / 3) * 4),
}).refine(({ mimeType, data }) => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) return false
  try {
    const bytes = atob(data)
    if (!bytes.length || bytes.length > catPhotoMaxBytes) return false
    if (mimeType === 'image/jpeg') return bytes.startsWith('\xff\xd8\xff')
    if (mimeType === 'image/png') return bytes.startsWith('\x89PNG\r\n\x1a\n')
    return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
  } catch { return false }
}, 'Choose a valid JPEG, PNG, or WebP image of 1 MB or less')

const birthDate = z.string().refine((value) => {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10)
}, 'Enter a valid birth date that is not in the future').default('')

export const createColonySchema = z.object({ name })
export const createCatSchema = z.object({
  name,
  colonyId: z.string('Choose a colony').trim().min(1, 'Choose a colony').max(120, 'Choose a colony'),
  birthDate,
  birthDateEstimated: z.boolean().default(false),
  description: z.string().trim().max(2000, 'Use 2000 characters or fewer').default(''),
  photo: photoSchema.nullable().optional(),
})
export type CatInput = z.input<typeof createCatSchema>
export type ValidCatInput = z.output<typeof createCatSchema>
