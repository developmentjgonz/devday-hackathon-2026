import { attachmentType } from '../../shared/attachments.ts'

type Attachment = { key: string; name: string; mimeType: string; size: number }
type ReadableAttachment = Omit<Attachment, 'key'> & { read: () => Promise<ArrayBuffer> }
type Content = { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'auto' } | { type: 'input_file'; filename: string; file_data: string }

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const fileTypes = new Set(['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
const audioExtensions: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm', 'audio/mpga': 'mpga', 'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/x-flac': 'flac' }
const audioNames = /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i
const maxBytes = 25 * 1024 * 1024

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const parts: string[] = []
  for (let index = 0; index < bytes.length; index += 0x8000) parts.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)))
  return btoa(parts.join(''))
}

async function transcribe(apiKey: string, attachment: ReadableAttachment, bytes: ArrayBuffer) {
  const extension = audioExtensions[attachment.mimeType]
  const name = audioNames.test(attachment.name) ? attachment.name : `${attachment.name}.${extension}`
  const form = new FormData()
  form.set('model', 'gpt-transcribe')
  form.set('file', new File([bytes], name, { type: attachment.mimeType }))
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error('Transcription failed')
  const result = await response.json() as { text?: unknown }
  if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('Transcription failed')
  return result.text
}

export async function analysisAttachments(bucket: R2Bucket, apiKey: string, attachments: Attachment[]) {
  return prepareAttachments(apiKey, attachments.map((attachment) => ({ ...attachment, read: async () => {
    const object = await bucket.get(attachment.key)
    if (!object) throw new Error('Missing attachment')
    return object.arrayBuffer()
  } })))
}

export async function uploadedAnalysisAttachments(apiKey: string, files: File[]) {
  return prepareAttachments(apiKey, files.map((file) => ({
    name: file.name, mimeType: attachmentType(file) ?? file.type, size: file.size, read: () => file.arrayBuffer(),
  })))
}

async function prepareAttachments(apiKey: string, attachments: ReadableAttachment[]) {
  const content: Content[] = []
  const skipped: { name: string; reason: string }[] = []
  let total = 0
  for (const attachment of attachments) {
    const isAudio = attachment.mimeType.startsWith('audio/')
    if (!imageTypes.has(attachment.mimeType) && !fileTypes.has(attachment.mimeType) && !(isAudio && (audioNames.test(attachment.name) || audioExtensions[attachment.mimeType]))) {
      skipped.push({ name: attachment.name, reason: 'This file format is not supported for analysis.' })
      continue
    }
    if (total + attachment.size > maxBytes) {
      skipped.push({ name: attachment.name, reason: 'The attachments exceed the analysis size limit.' })
      continue
    }
    try {
      const bytes = await attachment.read()
      if (!bytes.byteLength || bytes.byteLength !== attachment.size || total + bytes.byteLength > maxBytes) throw new Error('Invalid attachment size')
      total += bytes.byteLength
      if (isAudio) {
        const transcript = await transcribe(apiKey, attachment, bytes)
        content.push({ type: 'input_text', text: `Transcript of attachment ${JSON.stringify(attachment.name)}: ${transcript.slice(0, 40000)}` })
        if (transcript.length > 40000) skipped.push({ name: attachment.name, reason: 'Only the first part of this recording was analyzed.' })
      } else if (attachment.mimeType === 'text/plain' || attachment.mimeType === 'text/csv') {
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
        content.push({ type: 'input_text', text: `Contents of attachment ${JSON.stringify(attachment.name)}: ${text.slice(0, 40000)}` })
        if (text.length > 40000) skipped.push({ name: attachment.name, reason: 'Only the first part of this file was analyzed.' })
      } else {
        const data = `data:${attachment.mimeType};base64,${base64(bytes)}`
        content.push({ type: 'input_text', text: `Attachment: ${JSON.stringify(attachment.name)}` })
        content.push(imageTypes.has(attachment.mimeType)
          ? { type: 'input_image', image_url: data, detail: 'auto' }
          : { type: 'input_file', filename: attachment.name, file_data: data })
      }
    } catch {
      skipped.push({ name: attachment.name, reason: isAudio ? 'The recording could not be transcribed.' : 'The file could not be read.' })
    }
  }
  return { content, skipped }
}
