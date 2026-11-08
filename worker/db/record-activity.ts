import type { SessionUser } from '../../shared/types/auth.ts'
import type { ActivityChange, RecordActivity, RecordType } from '../../shared/types/record-activity.ts'

type ActivityInput = {
  operationId: string
  actor: Pick<SessionUser, 'name'> & { id: string | null }
  kind: RecordActivity['kind']
  summary: string
  changes?: ActivityChange[]
  reportId?: string
  occurredAt: string
}

export function activityStatement(db: D1Database, type: RecordType, recordId: string, event: ActivityInput) {
  return db.prepare(`INSERT OR IGNORE INTO record_activity
    (id, operation_id, record_type, record_id, kind, summary, changes_json, actor_id, actor_name, occurred_at, report_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), event.operationId, type, recordId, event.kind, event.summary, JSON.stringify(event.changes ?? []), event.actor.id, event.actor.name, event.occurredAt, event.reportId ?? null)
}

// Resolve related records inside the same database batch as the change. A task
// can reach a colony through either a directly linked cat or its linked report.
// D1 allows at most five terms in a compound SELECT.
const taskTargets = `
  SELECT 'cat' AS type, a.record_id AS id FROM task_associations a, target WHERE a.task_id = target.id AND a.type = 'cat'
  UNION SELECT 'colony', CASE WHEN a.type = 'colony' THEN a.record_id ELSE c.colony_id END
    FROM task_associations a LEFT JOIN cats c ON a.type = 'cat' AND c.id = a.record_id, target
    WHERE a.task_id = target.id AND a.type IN ('cat', 'colony')
  UNION SELECT 'cat', r.cat_id FROM tasks t JOIN reports r ON r.id = t.report_id, target WHERE t.id = target.id AND r.cat_id IS NOT NULL
  UNION SELECT 'colony', r.colony_id FROM tasks t JOIN reports r ON r.id = t.report_id, target WHERE t.id = target.id AND r.colony_id IS NOT NULL
  UNION SELECT 'colony', c.colony_id FROM tasks t JOIN reports r ON r.id = t.report_id JOIN cats c ON c.id = r.cat_id, target WHERE t.id = target.id
`
const reportTargets = `
  SELECT 'cat' AS type, r.cat_id AS id FROM reports r, target WHERE r.id = target.id AND r.cat_id IS NOT NULL
  UNION SELECT 'colony', r.colony_id FROM reports r, target WHERE r.id = target.id AND r.colony_id IS NOT NULL
`

function relatedActivityStatement(db: D1Database, targetId: string, targets: string, event: ActivityInput) {
  return db.prepare(`WITH target AS (SELECT ? AS id), related AS (${targets})
    INSERT OR IGNORE INTO record_activity
      (id, operation_id, record_type, record_id, kind, summary, changes_json, actor_id, actor_name, occurred_at, report_id)
    SELECT lower(hex(randomblob(16))), ?, type, id, ?, ?, ?, ?, ?, ?, ? FROM related WHERE id IS NOT NULL`)
    .bind(targetId, event.operationId, event.kind, event.summary, JSON.stringify(event.changes ?? []), event.actor.id, event.actor.name, event.occurredAt, event.reportId ?? null)
}

export function taskActivityStatement(db: D1Database, taskId: string, event: ActivityInput) {
  return relatedActivityStatement(db, taskId, taskTargets, event)
}
export function reportActivityStatement(db: D1Database, reportId: string, event: ActivityInput) {
  return relatedActivityStatement(db, reportId, reportTargets, event)
}

export async function listRecordActivity(db: D1Database, type: RecordType, id: string): Promise<RecordActivity[] | null> {
  const table = type === 'cat' ? 'cats' : 'colonies'
  if (!await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(id).first()) return null
  const rows = await db.prepare(`SELECT id, kind, summary, changes_json AS changesJson, actor_name AS actorName,
    occurred_at AS occurredAt, report_id AS reportId FROM record_activity
    WHERE record_type = ? AND record_id = ? ORDER BY occurred_at DESC, rowid DESC`).bind(type, id)
    .all<{ id: string; kind: RecordActivity['kind']; summary: string; changesJson: string; actorName: string; occurredAt: string; reportId: string | null }>()
  return rows.results.map(({ changesJson, reportId, ...row }) => ({ ...row, changes: (JSON.parse(changesJson) as (ActivityChange | null)[]).filter((change): change is ActivityChange => change !== null), ...(reportId ? { reportId } : {}) }))
}
