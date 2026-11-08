import { HTTPException } from 'hono/http-exception'
import { autopilotSchema, type AutopilotReportPlan } from '../../shared/schemas/automation.ts'
import type { AutomationEvent, AutomationProposal, AutomationRun, AutomationSnapshot, AutopilotSettings } from '../../shared/types/automation.ts'
import type { SessionUser } from '../../shared/types/auth.ts'
import type { Colony } from '../../shared/types/directory.ts'
import type { Report, Task } from '../../shared/types/workspace.ts'

export type ProposalPayload =
  | { type: 'report'; report: Report; plan: AutopilotReportPlan }
  | { type: 'merge'; source: Colony; target: Colony }
  | { type: 'assignment'; task: Task; ownerId: string; ownerName: string }
export type StoredProposal = AutomationProposal & { payload: ProposalPayload; runId: string }

export async function autopilotConfiguration(db: D1Database): Promise<{ settings: AutopilotSettings; enabledBy: string | null }> {
  const row = await db.prepare('SELECT autopilot_json AS settings, autopilot_enabled_by AS enabledBy FROM configuration WHERE id = 1').first<{ settings: string; enabledBy: string | null }>()
  if (!row) throw new Error('Configuration is missing.')
  return { settings: autopilotSchema.parse(JSON.parse(row.settings)), enabledBy: row.enabledBy }
}

export async function automationSnapshot(db: D1Database, offset = 0): Promise<AutomationSnapshot> {
  const [config, lock, run, proposals, events] = await Promise.all([
    autopilotConfiguration(db),
    db.prepare('SELECT token FROM automation_lock WHERE id = 1 AND expires_at > unixepoch()').first(),
    db.prepare('SELECT id, started_at AS startedAt, finished_at AS finishedAt, status, summary FROM automation_runs ORDER BY started_at DESC, rowid DESC LIMIT 1').first<AutomationRun>(),
    db.prepare("SELECT id, title, detail, changes_json AS changesJson, payload_json AS payloadJson, created_at AS createdAt FROM automation_proposals WHERE status = 'pending' ORDER BY created_at, rowid LIMIT 100").all<AutomationProposal & { changesJson: string; payloadJson: string }>(),
    db.prepare('SELECT id, kind, title, detail, target_path AS targetPath, occurred_at AS occurredAt FROM automation_events ORDER BY occurred_at DESC, rowid DESC LIMIT 51 OFFSET ?').bind(offset).all<AutomationEvent>(),
  ])
  return { settings: config.settings, running: Boolean(lock), lastRun: run,
    proposals: proposals.results.map(({ changesJson, payloadJson, ...row }) => {
      const payload = JSON.parse(payloadJson) as ProposalPayload
      const link = (label: string, type: string, id: string) => ({ label, to: `/app/${type}/${encodeURIComponent(id)}` })
      const links = payload.type === 'report' ? [link('Open report', 'reports', payload.report.id)]
        : payload.type === 'merge' ? [link('Open source colony', 'colonies', payload.source.id), link('Open surviving colony', 'colonies', payload.target.id)]
          : [link('Open task', 'tasks', payload.task.id)]
      return { ...row, changes: JSON.parse(changesJson), links }
    }),
    events: events.results.slice(0, 50), hasMore: events.results.length > 50 }
}

export async function acquireAutomation(db: D1Database) {
  const id = crypto.randomUUID()
  const lock = await db.prepare('UPDATE automation_lock SET token = ?, expires_at = unixepoch() + 600 WHERE id = 1 AND expires_at <= unixepoch() RETURNING token').bind(id).first()
  if (!lock) return null
  await db.batch([
    db.prepare("UPDATE automation_runs SET status = 'failed', finished_at = ?, summary = 'The previous run stopped before it finished.' WHERE status = 'running'").bind(new Date().toISOString()),
    db.prepare("INSERT INTO automation_runs (id, started_at, status) VALUES (?, ?, 'running')").bind(id, new Date().toISOString()),
  ])
  return id
}

export async function finishAutomation(db: D1Database, id: string, failed: boolean, summary: string) {
  await db.batch([
    db.prepare('UPDATE automation_runs SET finished_at = ?, status = ?, summary = ? WHERE id = ?').bind(new Date().toISOString(), failed ? 'failed' : 'completed', summary, id),
    db.prepare('UPDATE automation_lock SET token = NULL, expires_at = 0 WHERE id = 1 AND token = ?').bind(id),
  ])
}

export async function automationActor(db: D1Database, runId: string, feature: keyof AutopilotSettings): Promise<SessionUser> {
  const { settings, enabledBy } = await autopilotConfiguration(db)
  if (!settings.enabled || !settings[feature]) throw new HTTPException(409, { message: 'This autopilot feature is paused.' })
  const [lock, user] = await Promise.all([
    db.prepare('UPDATE automation_lock SET expires_at = unixepoch() + 600 WHERE id = 1 AND token = ? AND expires_at > unixepoch() RETURNING token').bind(runId).first(),
    db.prepare("SELECT id, name, email, phone, role, status FROM users WHERE id = ? AND role = 'administrator' AND status = 'active'").bind(enabledBy).first<SessionUser>(),
  ])
  if (!lock) throw new HTTPException(409, { message: 'This automation run has stopped.' })
  if (!user) throw new HTTPException(409, { message: 'An active administrator must enable autopilot again.' })
  return { ...user, name: 'Mews Autopilot' }
}

type EventInput = Omit<AutomationEvent, 'id' | 'occurredAt'> & { operationKey?: string; before?: unknown; after?: unknown }
export function automationEventStatement(db: D1Database, runId: string, event: EventInput) {
  return db.prepare(`INSERT INTO automation_events (id, run_id, operation_key, kind, title, detail, target_path, before_json, after_json, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), runId, event.operationKey ?? null, event.kind, event.title, event.detail, event.targetPath,
      JSON.stringify(event.before ?? null), JSON.stringify(event.after ?? null), new Date().toISOString())
}
export async function recordAutomationEvent(db: D1Database, runId: string, event: EventInput) {
  await automationEventStatement(db, runId, event).run()
}

// Existing domain operations keep their record history. Append the automation
// event to their batch so the change and its audit entry commit together.
export function auditedDatabase(db: D1Database, runId: string, event: EventInput): D1Database {
  return new Proxy(db, {
    get(target, property) {
      if (property === 'batch') return (statements: D1PreparedStatement[]) => target.batch([...statements, automationEventStatement(target, runId, event)])
      const value = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export function reportFingerprint(report: Report) {
  return JSON.stringify([report.title, report.message, report.status, report.colonyId, report.catId, report.careNote, report.urgent, report.duplicateOf, report.mapLocation, report.attachments, report.thread])
}

export async function queueProposal(db: D1Database, runId: string, subjectKey: string, title: string, detail: string, changes: string[], payload: ProposalPayload) {
  if (await db.prepare("SELECT id FROM automation_proposals WHERE subject_key = ? AND status = 'pending'").bind(subjectKey).first()) return
  await db.batch([
    db.prepare('INSERT INTO automation_proposals (id, run_id, subject_key, title, detail, changes_json, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), runId, subjectKey, title, detail, JSON.stringify(changes), JSON.stringify(payload), new Date().toISOString()),
    automationEventStatement(db, runId, { kind: 'review', title: `Human review requested: ${title}`, detail, targetPath: '/app/automation' }),
  ])
}

export async function readProposal(db: D1Database, id: string): Promise<StoredProposal> {
  const row = await db.prepare("SELECT id, run_id AS runId, title, detail, changes_json AS changesJson, payload_json AS payloadJson, created_at AS createdAt FROM automation_proposals WHERE id = ? AND status = 'pending'")
    .bind(id).first<AutomationProposal & { changesJson: string; payloadJson: string; runId: string }>()
  if (!row) throw new HTTPException(404, { message: 'This review is no longer pending.' })
  const { changesJson, payloadJson, ...proposal } = row
  return { ...proposal, changes: JSON.parse(changesJson), payload: JSON.parse(payloadJson) }
}
