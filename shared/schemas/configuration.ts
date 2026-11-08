import { z } from 'zod'

export const channelsSchema = z.strictObject({
  inboundPhone: z.string().trim().max(40, 'Phone number must be 40 characters or fewer.')
    .refine((value) => !value || (/^[+\d\s().-]+$/.test(value) && /\d/.test(value)), 'Enter a valid phone number.'),
  inboundEmail: z.string().trim().toLowerCase().max(254, 'Email address must be 254 characters or fewer.')
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address.'),
})

export const aiSchema = z.strictObject({
  openaiModel: z.string().trim().max(200, 'Model must be 200 characters or fewer.')
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Enter a valid model name.'),
  apiKey: z.string().trim().min(1, 'Enter an API key.').max(512, 'API key is too long.')
    .refine((value) => !/\s/.test(value), 'API keys cannot contain spaces.').optional(),
})

export type ChannelsInput = z.output<typeof channelsSchema>
export type AiInput = z.output<typeof aiSchema>
