import { z } from 'zod'

const id = z.string().trim().min(1).max(120)
const optionalId = z.string().trim().max(120)
const title = z.string('Enter a title').trim().min(1, 'Enter a title').max(160)
const text = z.string().trim().min(1).max(4000)
const due = z.string().refine((value) => {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Enter a valid due date')
const association = z.union([
  z.object({ type: z.enum(['cat', 'colony']), id }),
  z.object({ type: z.enum(['person', 'paperwork', 'other']), label: z.string().trim().min(1).max(120) }),
])

export const createReportSchema = z.object({ title, message: text, colonyId: optionalId, catId: optionalId, urgent: z.boolean() })
export const finishReportSchema = z.object({ colonyId: id, catId: optionalId, careNote: text, urgent: z.boolean() })
export const questionSchema = z.object({ text })
export const duplicateSchema = z.object({ targetId: id })
export const taskInputSchema = z.object({ title, ownerId: id, due, reportId: id.optional(), associations: z.array(association).max(30) })
export const taskStatusSchema = z.object({ status: z.enum(['open', 'completed']) })

export type CreateReportInput = z.output<typeof createReportSchema>
export type FinishReportInput = z.output<typeof finishReportSchema>
export type TaskInput = z.output<typeof taskInputSchema>
