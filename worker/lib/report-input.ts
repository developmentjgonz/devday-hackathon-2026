import { HTTPException } from 'hono/http-exception'
import { attachmentError, maxAttachmentSize } from '../../shared/attachments.ts'

/** Parse the same file payload for chat review and final submission. */
export async function readReportInput(request: Request) {
  let value: unknown
  let uploads: File[] = []
  const contentType = request.headers.get('Content-Type') ?? ''
  if (/^multipart\/form-data(?:\s*;|$)/i.test(contentType)) {
    let form: FormData
    try { form = await request.formData() } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
    const data = form.get('data')
    if (typeof data !== 'string' || data.length > 32 * 1024) throw new HTTPException(400, { message: 'Report data is invalid.' })
    try { value = JSON.parse(data) } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
    const files = form.getAll('files')
    if (files.some((file) => !(file instanceof File))) throw new HTTPException(400, { message: 'Choose valid attachments.' })
    uploads = files as File[]
    const error = attachmentError(uploads)
    if (error) throw new HTTPException(uploads.some((file) => file.size > maxAttachmentSize) ? 413 : 400, { message: error })
  } else if (/^application\/json(?:\s*;|$)/i.test(contentType)) {
    const body = await request.text()
    if (body.length > 32 * 1024) throw new HTTPException(413, { message: 'Report is too large.' })
    try { value = JSON.parse(body) } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
  } else throw new HTTPException(415, { message: 'Send report data and optional attachments.' })
  return { value, uploads }
}
