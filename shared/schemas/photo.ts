import { z } from 'zod'

export const photoMaxBytes = 1024 * 1024
export const photoSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.string().max(Math.ceil(photoMaxBytes / 3) * 4),
}).refine(({ mimeType, data }) => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) return false
  try {
    const bytes = atob(data)
    if (!bytes.length || bytes.length > photoMaxBytes) return false
    if (mimeType === 'image/jpeg') return bytes.startsWith('\xff\xd8\xff')
    if (mimeType === 'image/png') return bytes.startsWith('\x89PNG\r\n\x1a\n')
    return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
  } catch { return false }
}, 'Choose a valid JPEG, PNG, or WebP image of 1 MB or less')
