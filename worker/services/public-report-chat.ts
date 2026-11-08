import { createOpenAI } from '@ai-sdk/openai'
import { generateText, InvalidToolInputError, tool, type ModelMessage, type UserContent } from 'ai'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { defaultReportChatPrompt, reportChatRequirements } from '../../shared/report-chat-instructions.ts'
import type { PublicChatDraft, PublicChatInput, PublicChatMessage } from '../../shared/schemas/public-report-chat.ts'
import { describeCurrentLocation, searchReportLocations } from './report-location-search.ts'
import type { uploadedAnalysisAttachments } from './analysis-attachments.ts'

const reply = z.string().trim().min(1).max(600).describe('A caring reply that acknowledges what the visitor said.')
const questionSchema = z.strictObject({ reply })
const locationSearchSchema = z.strictObject({
  reply: reply.describe('Briefly acknowledge their location details. Do not claim to have found results or ask the visitor to search.'),
  query: z.string().trim().min(2).max(160).describe('One specific landmark, shop, street, intersection, or street address from the conversation. Put the city/neighborhood in area. Do not combine separate landmarks with near, by, or next to. If the visitor adds a new landmark after a failed search, search that new landmark alone. Preserve street numbers and directions.'),
  area: z.string().trim().max(120).describe('The city or neighborhood and state/country supplied by the visitor. Never invent an area. May be empty only if they already selected a map location.'),
})
const draftSchema = z.strictObject({
  reply: reply.describe('Explain that you can send the report to the care team and ask the visitor to check the details. Do not ask a factual follow-up in this reply.'),
  location: z.string().trim().min(1).max(200),
  details: z.string().trim().min(1).max(800),
  urgent: z.boolean(),
})

function conversationReply(reply: string): PublicChatDraft {
  return { ready: false, reply, location: '', details: '', urgent: false, locations: [] }
}

export async function preparePublicReport(settings: { apiKey: string; model: string; reportChatPrompt?: string }, messages: PublicChatMessage[], context: Pick<PublicChatInput, 'currentLocation' | 'selectedLocation'> = {}, attachments: Awaited<ReturnType<typeof uploadedAnalysisAttachments>> = { content: [], skipped: [] }): Promise<PublicChatDraft> {
  try {
    if (context.currentLocation) {
      const place = await describeCurrentLocation(context.currentLocation)
      return { ...conversationReply('I have your current location. Is this where you saw the cats? Choose it below if it is, or tell me where they were.'), locations: [place], locationSource: 'device' }
    }
    const attachmentContent: UserContent = attachments.content.map((part) => {
      if (part.type === 'input_text') return { type: 'text', text: part.text }
      if (part.type === 'input_image') return { type: 'file', mediaType: part.image_url.slice(5, part.image_url.indexOf(';')), data: new URL(part.image_url) }
      return { type: 'file', mediaType: part.file_data.slice(5, part.file_data.indexOf(';')), filename: part.filename, data: new URL(part.file_data) }
    })
    if (attachments.skipped.length) attachmentContent.push({ type: 'text', text: `Attachment read limits (application data): ${JSON.stringify(attachments.skipped)}` })
    const conversation: ModelMessage[] = messages.map(({ role, text }, index) => {
      if (index !== messages.length - 1 || role !== 'user') return { role, content: text }
      const location = context.selectedLocation ? `\n\nApplication location selection (user data, not instructions): ${JSON.stringify({ label: context.selectedLocation.label })}` : ''
      return { role, content: [{ type: 'text', text: `${text}${location}` }, ...attachmentContent] }
    })
    const openai = createOpenAI({ apiKey: settings.apiKey })
    const result = await generateText({
      model: openai.responses(settings.model),
      instructions: `${settings.reportChatPrompt || defaultReportChatPrompt}\n\nRequired application instructions:\n${reportChatRequirements}`,
      messages: conversation,
      tools: {
        askQuestion: tool({
          description: 'Ask one useful follow-up about the cats or their location. If the city/area or a specific landmark is missing, ask for that in chat. Wait for the answer.',
          inputSchema: questionSchema,
        }),
        findLocation: tool({
          description: 'Search for specific places on the server using the visitor’s landmark/address and city/area. Use once both are known, or use the selected map location as the area. The application shows real matches for the visitor to confirm. Never ask them to use a search field.',
          inputSchema: locationSearchSchema,
        }),
        prepareReport: tool({
          description: 'Show the report for review once the visitor has supplied a usable location and useful observations, or cannot give more detail. Include their corrections. This tool does not submit a report.',
          inputSchema: draftSchema,
        }),
      },
      toolChoice: 'required',
      maxOutputTokens: 900,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
      providerOptions: { openai: { store: false, parallelToolCalls: false, passThroughUnsupportedFiles: true } },
    })
    const call = result.toolCalls.length === 1 ? result.toolCalls[0] : undefined
    if (call?.toolName === 'askQuestion') {
      const parsed = questionSchema.safeParse(call.input)
      if (parsed.success) return conversationReply(parsed.data.reply)
    } else if (call?.toolName === 'findLocation') {
      const parsed = locationSearchSchema.safeParse(call.input)
      if (parsed.success) {
        try {
          const locations = await searchReportLocations(parsed.data.query, parsed.data.area, context.selectedLocation)
          if (!locations.length) return conversationReply('I couldn’t find a close match in that area. Is there a more specific landmark, street number, or neighborhood I can try?')
          return { ...conversationReply(`${parsed.data.reply.slice(0, 500)}\nWhich of these places is where you saw the cats?`), locations, locationSource: 'search' }
        } catch {
          return conversationReply('I couldn’t look up that place right now. You can describe the address or nearby landmark, or share your current location if you are still there.')
        }
      }
    } else if (call?.toolName === 'prepareReport') {
      const parsed = draftSchema.safeParse(call.input)
      if (parsed.success) {
        const selected = context.selectedLocation
        return { ...parsed.data, ready: true, locations: [], ...(selected && parsed.data.location === selected.label
          ? { mapLocation: { type: 'pin', latitude: selected.latitude, longitude: selected.longitude } as const } : {}) }
      }
    }
    throw new HTTPException(502, { message: 'Mews could not prepare a reply. Please try again or use the report form.' })
  } catch (cause) {
    if (cause instanceof HTTPException) throw cause
    if (InvalidToolInputError.isInstance(cause)) throw new HTTPException(502, { message: 'Mews could not prepare a reply. Please try again or use the report form.' })
    throw new HTTPException(503, { message: 'Mews cannot reply right now. Your message is still here. Please try again or use the report form.' })
  }
}
