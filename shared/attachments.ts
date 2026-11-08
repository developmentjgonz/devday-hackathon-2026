export const maxAttachments = 5
export const maxAttachmentSize = 10 * 1024 * 1024
export const attachmentAccept = 'image/jpeg,image/png,image/gif,image/webp,image/avif,audio/*,.pdf,.txt,.docx,.csv'

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
const documents: Record<string, string> = { pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }

export function attachmentType(file: { name: string; type: string }): string | null {
  const mime = file.type.toLowerCase()
  if (imageTypes.has(mime) || /^audio\/[a-z0-9.+-]+$/.test(mime)) return mime
  return documents[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? null
}

export function attachmentError(files: { name: string; type: string; size: number }[]): string {
  if (files.length > maxAttachments) return 'Add up to 5 attachments.'
  if (files.some((file) => file.size > maxAttachmentSize)) return 'Each attachment must be 10 MB or smaller.'
  if (files.some((file) => !file.size)) return 'Choose files that are not empty.'
  if (files.some((file) => !attachmentType(file))) return 'Choose supported photos, audio, PDF, text, Word, or CSV files.'
  return ''
}
