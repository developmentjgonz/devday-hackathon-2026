import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { validator } from 'hono/validator'
import type { z } from 'zod'

export const requireJson = createMiddleware(async (c, next) => {
  if (!/^application\/json(?:\s*;.*)?$/i.test(c.req.header('Content-Type') ?? '')) {
    throw new HTTPException(415, { message: 'Send JSON data' })
  }
  if (!c.req.raw.body) throw new HTTPException(400, { message: 'Request body is required' })
  await next()
})

export const limitFormBody = bodyLimit({
  maxSize: 4096,
  onError: () => { throw new HTTPException(413, { message: 'Form data is too large' }) },
})

export const limitCatBody = bodyLimit({
  maxSize: 1_450_000,
  onError: () => { throw new HTTPException(413, { message: 'Cat details or photo are too large' }) },
})

export const limitProfileBody = bodyLimit({
  maxSize: 1_450_000,
  onError: () => { throw new HTTPException(413, { message: 'Profile or photo is too large' }) },
})

export function validateJson<T extends z.ZodType>(schema: T) {
  return validator('json', (value) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      throw new HTTPException(400, { message: result.error.issues[0]?.message ?? 'Form data is invalid' })
    }
    return result.data
  })
}
