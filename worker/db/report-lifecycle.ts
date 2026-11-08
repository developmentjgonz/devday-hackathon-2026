import type { SessionUser } from '../../shared/types/auth.ts'

// Review completion is stored on the report. Work completion is derived from
// its tasks, so concurrent task updates cannot leave a stale report status.
// The persisted 'processed' value means the review is complete.
export const reportStatusSql = `CASE WHEN r.status = 'processed' AND EXISTS (
  SELECT 1 FROM tasks lifecycle_task WHERE lifecycle_task.report_id = r.id AND lifecycle_task.status = 'open'
) THEN 'in_progress' ELSE r.status END`

export function reportTaskLifecycleHistory(db: D1Database, reportId: string, actor: SessionUser, status: 'open' | 'completed') {
  const condition = status === 'completed'
    ? "NOT EXISTS (SELECT 1 FROM tasks WHERE report_id = r.id AND status = 'open')"
    : "(SELECT COUNT(*) FROM tasks WHERE report_id = r.id AND status = 'open') = 1"
  const text = status === 'completed' ? 'resolved the report after all linked tasks were completed.' : 'returned the report to In progress because a linked task is open.'
  return db.prepare(`INSERT INTO report_history (id, report_id, actor_id, text, created_at)
    SELECT ?, r.id, ?, ?, ? FROM reports r WHERE r.id = ? AND r.status = 'processed' AND ${condition}`)
    .bind(crypto.randomUUID(), actor.id, `${actor.name} ${text}`, new Date().toISOString(), reportId)
}
