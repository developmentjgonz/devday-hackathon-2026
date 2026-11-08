export type AutopilotSettings = {
  enabled: boolean
  resolveReports: boolean
  assignTasks: boolean
  updateRecords: boolean
  mergeColonies: boolean
  requireHumanReview: boolean
}

export const defaultAutopilot: AutopilotSettings = {
  enabled: false, resolveReports: true, assignTasks: true,
  updateRecords: true, mergeColonies: true, requireHumanReview: true,
}

export type AutomationEvent = {
  id: string
  kind: 'report' | 'task' | 'cat' | 'colony' | 'merge' | 'review' | 'error'
  title: string
  detail: string
  targetPath: string | null
  occurredAt: string
}
export type AutomationProposal = {
  id: string
  title: string
  detail: string
  changes: string[]
  links?: { label: string; to: string }[]
  createdAt: string
}
export type AutomationRun = {
  id: string
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'completed' | 'failed'
  summary: string
}
export type AutomationSnapshot = {
  settings: AutopilotSettings
  running: boolean
  lastRun: AutomationRun | null
  proposals: AutomationProposal[]
  events: AutomationEvent[]
  hasMore: boolean
}
