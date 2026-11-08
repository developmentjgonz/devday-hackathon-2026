export const maxAttachments = 5
export const maxAttachmentSize = 10 * 1024 * 1024
export const attachmentAccept = 'image/jpeg,image/png,image/gif,image/webp,image/avif,audio/*,.pdf,.txt,.docx,.csv'

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
const documents: Record<string, string> = { pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
const mediaExtensions: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', mp3: 'audio/mpeg', mp4: 'audio/mp4', m4a: 'audio/mp4', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', flac: 'audio/flac' }

export function attachmentType(file: { name: string; type: string }): string | null {
  const mime = file.type.toLowerCase()
  if (imageTypes.has(mime) || /^audio\/[a-z0-9.+-]+$/.test(mime)) return mime
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return documents[extension] ?? ((!mime || mime === 'application/octet-stream') ? mediaExtensions[extension] ?? null : null)
}

export function attachmentError(files: { name: string; type: string; size: number }[]): string {
  if (files.length > maxAttachments) return 'Add up to 5 attachments.'
  if (files.some((file) => file.size > maxAttachmentSize)) return 'Each attachment must be 10 MB or smaller.'
  if (files.some((file) => !file.size)) return 'Choose files that are not empty.'
  if (files.some((file) => !attachmentType(file))) return 'Choose supported photos, audio, PDF, text, Word, or CSV files.'
  return ''
}
