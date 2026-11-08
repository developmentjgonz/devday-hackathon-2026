import { z } from 'zod'

export const publicReportContactSchema = z.strictObject({
  phone: z.string().trim().max(40).regex(/^\+?[\d\s().-]+$/, 'Enter a valid phone number.').refine((value) => {
    const digits = value.replace(/\D/g, '').length
    return digits >= 7 && digits <= 15
  }, 'Enter a phone number with 7 to 15 digits.').optional(),
  email: z.email('Enter a valid email address.').max(254).optional(),
  consent: z.literal(true, { error: 'Allow the care team to contact you before sharing contact details.' }),
}).refine((value) => Boolean(value.phone || value.email), { path: ['phone'], message: 'Enter a phone number or email address, or turn off follow-up contact.' })

export type PublicReportContact = z.output<typeof publicReportContactSchema>

export const publicReportMapLocationSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('pin'), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  z.strictObject({ type: z.literal('google-place'), placeId: z.string().trim().min(1).max(512) }),
])

export const publicReportSchema = z.strictObject({
  location: z.string().trim().max(200, 'Keep the location under 200 characters.'),
  details: z.string().trim().min(1, 'Enter what you saw.').max(3700, 'Keep the details under 3,700 characters.'),
  urgent: z.boolean(),
  mapLocation: publicReportMapLocationSchema.optional(),
  contact: publicReportContactSchema.optional(),
}).refine((value) => Boolean(value.location || value.mapLocation), { path: ['location'], message: 'Enter a location or choose one on the map.' })

export type PublicReportInput = z.output<typeof publicReportSchema>
export type PublicReportMapLocation = z.output<typeof publicReportMapLocationSchema>
