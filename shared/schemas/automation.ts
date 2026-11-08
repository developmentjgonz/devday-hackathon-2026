import { z } from 'zod'

export const autopilotSchema = z.strictObject({
  enabled: z.boolean(), resolveReports: z.boolean(), assignTasks: z.boolean(),
  updateRecords: z.boolean(), mergeColonies: z.boolean(), requireHumanReview: z.boolean(),
}).refine((input) => !input.enabled || input.resolveReports || input.assignTasks || input.updateRecords || input.mergeColonies,
  { message: 'Select at least one autopilot feature.' })

const reason = z.string().trim().min(1).max(600)
export const autopilotReportPlanSchema = z.strictObject({
  summary: reason,
  needsReview: z.boolean(),
  duplicateReportId: z.string().max(120).nullable(),
  tasks: z.array(z.strictObject({ title: z.string().trim().min(1).max(160), reason })).max(5),
  colony: z.strictObject({ id: z.string().max(120).nullable(), name: z.string().trim().min(1).max(120), reason }).nullable(),
  cats: z.array(z.strictObject({ id: z.string().max(120).nullable(), name: z.string().trim().min(1).max(120), details: z.string().trim().min(1).max(1000), reason })).max(5),
})
export type AutopilotReportPlan = z.output<typeof autopilotReportPlanSchema>
