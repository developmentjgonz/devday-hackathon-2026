import { z } from 'zod'
import { photoSchema } from './photo.ts'

export const localSignInSchema = z.object({
  userId: z.string('Choose a test account').min(1, 'Choose a test account').max(100, 'Choose a test account'),
})

export const signUpSchema = z.object({
  name: z.string('Enter a name with 1 to 120 characters').trim()
    .min(1, 'Enter a name with 1 to 120 characters').max(120, 'Enter a name with 1 to 120 characters'),
  email: z.string('Enter a valid email address').trim().toLowerCase()
    .max(254, 'Enter a valid email address').regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  phone: z.string('Phone number must be 40 characters or fewer').trim()
    .max(40, 'Phone number must be 40 characters or fewer').nullish()
    .transform((phone) => phone || null),
})

export type SignUpProfile = z.output<typeof signUpSchema>

export const profileSchema = signUpSchema.extend({
  photo: photoSchema.nullable().optional(),
}).strict()
export type ProfileInput = z.input<typeof profileSchema>
export type ValidProfileInput = z.output<typeof profileSchema>
