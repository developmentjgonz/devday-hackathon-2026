import { z } from 'zod'
import { photoSchema } from './photo.ts'

const name = z.string('Enter a name with 1 to 120 characters').trim()
  .min(1, 'Enter a name with 1 to 120 characters').max(120, 'Enter a name with 1 to 120 characters')

const birthDate = z.string().refine((value) => {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10)
}, 'Enter a valid birth date that is not in the future').default('')

const coordinates = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
])
const address = z.string().trim().max(500, 'Use 500 characters or fewer').default('')
const googlePlaceId = z.string().trim().min(1).max(512).optional()
export const createColonySchema = z.object({ name, coordinates: coordinates.optional(), address, googlePlaceId })
  .refine((input) => input.coordinates || !input.address, { path: ['address'], message: 'Set a location to add an address' })
  .refine((input) => !input.googlePlaceId || (!input.coordinates && !input.address), { path: ['googlePlaceId'], message: 'A Google place cannot include saved address data' })
export const colonyLocationSchema = z.object({ coordinates: coordinates.nullable(), address, googlePlaceId })
  .refine((input) => input.coordinates || !input.address, { path: ['address'], message: 'Set a location to add an address' })
  .refine((input) => !input.googlePlaceId || (!input.coordinates && !input.address), { path: ['googlePlaceId'], message: 'A Google place cannot include saved address data' })
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
