import { HTTPException } from 'hono/http-exception'
import type { CareRuleInput } from '../../shared/schemas/workspace.ts'
import type { CareRule } from '../../shared/types/workspace.ts'
import type { SessionUser } from '../../shared/types/auth.ts'
import { taskActivityStatement } from './record-activity.ts'

type CareRuleRow = Omit<CareRule, 'active'> & { active: number }
const dayMs = 24 * 60 * 60 * 1000

function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10)
}

function nextOccurrence(start: string, repeatDays: number, from: string) {
  const difference = (Date.parse(`${from}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / dayMs
  return addDays(start, Math.max(0, Math.ceil(difference / repeatDays)) * repeatDays)
}

export async function listCareRules(db: D1Database, id: string | null = null): Promise<CareRule[]> {
  const rows = await db.prepare(`SELECT r.id, r.title, r.owner_id AS ownerId, u.name AS owner,
    CASE WHEN r.cat_id IS NOT NULL THEN 'cat' ELSE 'colony' END AS recordType,
    COALESCE(r.cat_id, r.colony_id) AS recordId, r.repeat_days AS repeatDays,
    r.start_date AS startDate, r.next_due AS nextDue, r.active, r.created_by AS createdBy
    FROM care_rules r JOIN users u ON u.id = r.owner_id
    WHERE (? IS NULL OR r.id = ?) ORDER BY r.created_at, r.id`).bind(id, id).all<CareRuleRow>()
  return rows.results.map((row) => ({ ...row, active: Boolean(row.active) }))
}

async function requireEditableRule(db: D1Database, id: string, actor: SessionUser) {
  const rule = (await listCareRules(db, id))[0]
  if (!rule) throw new HTTPException(404, { message: 'Care rule not found.' })
  if (rule.ownerId !== actor.id && rule.createdBy !== actor.id && actor.role !== 'administrator') {
    throw new HTTPException(403, { message: 'Only the creator, assignee, or an administrator can change this rule.' })
  }
  return rule
}

async function validateRule(db: D1Database, input: CareRuleInput) {
  const table = input.recordType === 'cat' ? 'cats' : 'colonies'
  const [owner, record] = await Promise.all([
    db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active' AND task_assignable = 1").bind(input.ownerId).first(),
    db.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(input.recordId).first(),
  ])
  if (!owner) throw new HTTPException(400, { message: 'Choose a team member who can be assigned tasks.' })
  if (!record) throw new HTTPException(400, { message: `The ${input.recordType} was not found.` })
}

export async function createCareRule(db: D1Database, actor: SessionUser, input: CareRuleInput) {
  await validateRule(db, input)
  // A local calendar date can be one day behind UTC.
  if (input.startDate < addDays(new Date().toISOString().slice(0, 10), -1)) {
    throw new HTTPException(400, { message: 'Choose today or a future date.' })
  }
  const id = crypto.randomUUID()
  await db.prepare(`INSERT INTO care_rules
    (id, title, owner_id, cat_id, colony_id, repeat_days, start_date, next_due, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, input.title, input.ownerId, input.recordType === 'cat' ? input.recordId : null,
      input.recordType === 'colony' ? input.recordId : null, input.repeatDays, input.startDate, input.startDate, actor.id, new Date().toISOString()).run()
  return id
}

export async function editCareRule(db: D1Database, id: string, actor: SessionUser, input: CareRuleInput) {
  const rule = await requireEditableRule(db, id, actor)
  if (rule.recordId !== input.recordId || rule.recordType !== input.recordType) throw new HTTPException(400, { message: 'The linked record cannot be changed.' })
  await validateRule(db, input)
  const scheduleChanged = rule.startDate !== input.startDate || rule.repeatDays !== input.repeatDays
  const nextDue = scheduleChanged ? nextOccurrence(input.startDate, input.repeatDays, new Date().toISOString().slice(0, 10)) : rule.nextDue
  await db.prepare('UPDATE care_rules SET title = ?, owner_id = ?, repeat_days = ?, start_date = ?, next_due = ? WHERE id = ?')
    .bind(input.title, input.ownerId, input.repeatDays, input.startDate, nextDue, id).run()
}

export async function setCareRuleActive(db: D1Database, id: string, actor: SessionUser, active: boolean) {
  const rule = await requireEditableRule(db, id, actor)
  if (rule.active === active) return
  const nextDue = active ? nextOccurrence(rule.startDate, rule.repeatDays, new Date().toISOString().slice(0, 10)) : rule.nextDue
  await db.prepare('UPDATE care_rules SET active = ?, next_due = ? WHERE id = ?').bind(Number(active), nextDue, id).run()
}

// Generate through tomorrow UTC, so date-only tasks exist before the due day
// begins in every time zone. The cursor and occurrence index make retries safe.
export async function generateCareTasks(db: D1Database, now = new Date(), onlyRuleId: string | null = null): Promise<string[]> {
  const horizon = addDays(now.toISOString().slice(0, 10), 1)
  const candidates = await db.prepare('SELECT id FROM care_rules WHERE active = 1 AND next_due <= ? AND (? IS NULL OR id = ?) ORDER BY next_due, id')
    .bind(horizon, onlyRuleId, onlyRuleId).all<{ id: string }>()
  const taskIds: string[] = []
  for (const { id } of candidates.results) {
    // Bound catch-up work. A later invocation continues from the saved cursor.
    for (let count = 0; count < 90; count++) {
      const current = await db.prepare('SELECT next_due AS nextDue FROM care_rules WHERE id = ? AND active = 1 AND next_due <= ?')
        .bind(id, horizon).first<{ nextDue: string }>()
      if (!current) break
      const taskId = crypto.randomUUID()
      const createdAt = now.toISOString()
      await db.batch([
        db.prepare(`INSERT OR IGNORE INTO tasks (id, title, owner_id, due, created_by, created_at, care_rule_id, care_rule_due)
          SELECT ?, title, owner_id, next_due, created_by, ?, id, next_due FROM care_rules
          WHERE id = ? AND active = 1 AND next_due = ?`).bind(taskId, createdAt, id, current.nextDue),
        db.prepare(`INSERT INTO task_associations (task_id, position, type, record_id, label)
          SELECT ?, 0, CASE WHEN cat_id IS NOT NULL THEN 'cat' ELSE 'colony' END, COALESCE(cat_id, colony_id), NULL
          FROM care_rules WHERE id = ? AND EXISTS (SELECT 1 FROM tasks WHERE id = ?)`).bind(taskId, id, taskId),
        taskActivityStatement(db, taskId, { operationId: crypto.randomUUID(), actor: { id: null, name: 'Care schedule' }, kind: 'task', summary: 'Task created from a care rule', occurredAt: createdAt }),
        db.prepare("UPDATE care_rules SET next_due = date(next_due, '+' || repeat_days || ' days') WHERE id = ? AND active = 1 AND next_due = ?")
          .bind(id, current.nextDue),
      ])
      taskIds.push(taskId)
    }
  }
  return taskIds
}
