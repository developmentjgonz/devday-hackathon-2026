import { z } from 'zod'
import type { DuplicateReport } from '../types/workspace.ts'

const explanation = z.string().trim().min(1).max(600)
const recordSuggestion = z.strictObject({
  name: z.string().trim().max(120),
  details: z.string().trim().min(1).max(1000),
  reason: explanation,
})

export const reportAnalysisSchema = z.strictObject({
  tasks: z.array(z.strictObject({ title: z.string().trim().min(1).max(160), reason: explanation })).max(5),
  cats: z.array(recordSuggestion).max(5),
  colonies: z.array(recordSuggestion).max(5),
  duplicates: z.array(z.strictObject({ reportId: z.string().min(1).max(200), reason: explanation })).max(5),
})

export type ReportAnalysis = Omit<z.output<typeof reportAnalysisSchema>, 'duplicates'> & {
  duplicates: { report: DuplicateReport; reason: string }[]
  skippedAttachments: { name: string; reason: string }[]
}
