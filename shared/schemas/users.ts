import { z } from 'zod'

export const userAccessChangeSchema = z.strictObject({
  role: z.enum(['administrator', 'member']),
  status: z.enum(['active', 'suspended']),
  expectedRole: z.enum(['administrator', 'member']),
  expectedStatus: z.enum(['pending', 'active', 'suspended']),
})
