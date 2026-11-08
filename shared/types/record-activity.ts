export type RecordType = 'cat' | 'colony'
export type ActivityChange = { field: string; before: string; after: string }
export type RecordActivity = {
  id: string
  kind: 'profile' | 'task' | 'report'
  summary: string
  actorName: string
  occurredAt: string
  changes: ActivityChange[]
  reportId?: string
}
