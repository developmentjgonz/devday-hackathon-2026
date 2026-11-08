import { z } from 'zod'
import type { PublicReportMapLocation } from './public-report.ts'

export const chatCoordinatesSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
})
export const chatLocationSchema = z.strictObject({
  label: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const publicChatMessageSchema = z.discriminatedUnion('role', [
  z.strictObject({ role: z.literal('user'), text: z.string().trim().min(1).max(300) }),
  z.strictObject({ role: z.literal('assistant'), text: z.string().trim().min(1).max(1200) }),
])

export const publicReportChatSchema = z.strictObject({
  messages: z.array(publicChatMessageSchema).min(1).max(15),
  currentLocation: chatCoordinatesSchema.optional(),
  selectedLocation: chatLocationSchema.optional(),
}).refine(({ messages }) => messages.every((message, index) => message.role === (index % 2 === 0 ? 'user' : 'assistant')),
  'The conversation is invalid.')
  .refine(({ messages }) => messages.at(-1)?.role === 'user', 'The conversation must end with a message.')

export type PublicChatMessage = z.output<typeof publicChatMessageSchema>
export type ChatCoordinates = z.output<typeof chatCoordinatesSchema>
export type ChatLocation = z.output<typeof chatLocationSchema>
export type ChatPlace = ChatLocation & { title: string; description: string }
export type PublicChatInput = z.output<typeof publicReportChatSchema>
export type PublicChatDraft = {
  ready: boolean; reply: string; location: string; details: string; urgent: boolean
  locations: ChatPlace[]
  locationSource?: 'search' | 'device'
  mapLocation?: PublicReportMapLocation
  skippedAttachments?: { name: string; reason: string }[]
}
