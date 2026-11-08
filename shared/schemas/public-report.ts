import { z } from 'zod'

export const publicReportSchema = z.strictObject({
  location: z.string().trim().min(1, 'Enter a location.').max(200, 'Keep the location under 200 characters.'),
  details: z.string().trim().min(1, 'Enter what you saw.').max(3700, 'Keep the details under 3,700 characters.'),
  urgent: z.boolean(),
})

export type PublicReportInput = z.output<typeof publicReportSchema>
