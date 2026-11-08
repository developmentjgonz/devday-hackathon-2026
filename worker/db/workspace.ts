import { isReportClosed } from '../../shared/types/workspace.ts'
import { HTTPException } from 'hono/http-exception'
import type { CreateReportInput, FinishReportInput, TaskInput } from '../../shared/schemas/workspace.ts'
import type { Report, ReportAttachment, ReportEntry, Task, TaskAssociation, TaskStatus, WorkspaceMember, WorkspaceSnapshot } from '../../shared/types/workspace.ts'
import type { SessionUser } from '../../shared/types/auth.ts'
import type { ActivityChange } from '../../shared/types/record-activity.ts'
import { reportActivityStatement, taskActivityStatement } from './record-activity.ts'
import { listCareRules } from './care-rules.ts'

type ReportRow = { id: string; title: string; message: string; category: string; reporter: string; anonymous: number; submittedAt: string; colonyId: string | null; catId: string | null; careNote: string; urgent: number; status: Report['status']; possibleDuplicateOf: string | null; duplicateOf: string | null; latitude: number | null; longitude: number | null; placeId: string | null; contactPhone: string | null; contactEmail: string | null; contactConsentedAt: string | null }
type AttachmentRow = { id: string; reportId: string; name: string; mimeType: string; size: number }
type EntryRow = ReportEntry & { reportId: string }
type HistoryRow = { reportId: string; text: string }
type TaskRow = { id: string; title: string; ownerId: string; owner: string; due: string; status: TaskStatus; completedAt: string | null; completionNote: string | null; reportId: string | null; careRuleId: string | null }
type AssociationRow = { taskId: string; type: TaskAssociation['type']; recordId: string | null; label: string | null }
export type StoredAttachment = { id: string; key: string; name: string; mimeType: string; size: number }

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>()
  for (const item of items) { const group = key(item); result.set(group, [...(result.get(group) ?? []), item]) }
  return result
}

export async function listReports(db: D1Database, reportId: string | null = null): Promise<Report[]> {
  const [reports, attachments, entries, history] = await Promise.all([
    db.prepare(`SELECT r.id, r.title, r.message, r.category, COALESCE(u.name, CASE WHEN r.public_contact_consented_at IS NOT NULL THEN 'Community sender' ELSE 'Anonymous' END) AS reporter, (r.reporter_id IS NULL) AS anonymous, r.submitted_at AS submittedAt,
      r.colony_id AS colonyId, r.cat_id AS catId, r.care_note AS careNote, r.urgent, r.status,
      r.possible_duplicate_id AS possibleDuplicateOf, r.duplicate_of AS duplicateOf, r.public_latitude AS latitude, r.public_longitude AS longitude, r.public_google_place_id AS placeId,
      r.public_contact_phone AS contactPhone, r.public_contact_email AS contactEmail, r.public_contact_consented_at AS contactConsentedAt
      FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
      WHERE (? IS NULL OR r.id = ?) ORDER BY r.submitted_at DESC, r.id`).bind(reportId, reportId).all<ReportRow>(),
    db.prepare('SELECT id, report_id AS reportId, name, mime_type AS mimeType, size FROM report_attachments WHERE (? IS NULL OR report_id = ?) ORDER BY rowid').bind(reportId, reportId).all<AttachmentRow>(),
    db.prepare(`SELECT e.id, e.report_id AS reportId, u.name AS author, e.text FROM report_entries e
      JOIN users u ON u.id = e.author_id WHERE (? IS NULL OR e.report_id = ?) ORDER BY e.created_at, e.rowid`).bind(reportId, reportId).all<EntryRow>(),
    db.prepare('SELECT report_id AS reportId, text FROM report_history WHERE (? IS NULL OR report_id = ?) ORDER BY created_at, rowid').bind(reportId, reportId).all<HistoryRow>(),
  ])
  const files = groupBy(attachments.results, (item) => item.reportId)
  const messages = groupBy(entries.results, (item) => item.reportId)
  const events = groupBy(history.results, (item) => item.reportId)
  return reports.results.map((row) => ({
    id: row.id, title: row.title, reporter: row.reporter, ...(row.anonymous ? { anonymous: true } : {}), submittedAt: row.submittedAt, message: row.message, category: row.category,
    ...(row.placeId ? { mapLocation: { type: 'google-place' as const, placeId: row.placeId } } : row.latitude !== null && row.longitude !== null ? { mapLocation: { type: 'pin' as const, latitude: row.latitude, longitude: row.longitude } } : {}),
    ...(row.contactConsentedAt ? { contact: { consent: true as const, consentedAt: row.contactConsentedAt, ...(row.contactPhone ? { phone: row.contactPhone } : {}), ...(row.contactEmail ? { email: row.contactEmail } : {}) } } : {}),
    colonyId: row.colonyId ?? '', catId: row.catId ?? '', careNote: row.careNote, urgent: Boolean(row.urgent), status: row.status,
    ...(row.possibleDuplicateOf ? { possibleDuplicateOf: row.possibleDuplicateOf } : {}),
    ...(row.duplicateOf ? { duplicateOf: row.duplicateOf } : {}),
    attachments: (files.get(row.id) ?? []).map((item): ReportAttachment => ({ id: item.id, name: item.name, mimeType: item.mimeType, size: item.size, url: `/api/attachments/${encodeURIComponent(item.id)}` })),
    thread: (messages.get(row.id) ?? []).map(({ id, author, text }) => ({ id, author, text })),
    history: (events.get(row.id) ?? []).map((item) => item.text),
  }))
}

export async function listTasks(db: D1Database, taskId: string | null = null): Promise<Task[]> {
  const [tasks, associations] = await Promise.all([
    db.prepare(`SELECT t.id, t.title, t.owner_id AS ownerId, u.name AS owner, t.due, t.status, t.completed_at AS completedAt, t.completion_note AS completionNote, t.report_id AS reportId, t.care_rule_id AS careRuleId
      FROM tasks t JOIN users u ON u.id = t.owner_id WHERE (? IS NULL OR t.id = ?) ORDER BY t.created_at, t.id`).bind(taskId, taskId).all<TaskRow>(),
    db.prepare('SELECT task_id AS taskId, type, record_id AS recordId, label FROM task_associations WHERE (? IS NULL OR task_id = ?) ORDER BY position').bind(taskId, taskId).all<AssociationRow>(),
  ])
  const links = groupBy(associations.results, (item) => item.taskId)
  return tasks.results.map((task) => ({
    id: task.id, title: task.title, ownerId: task.ownerId, owner: task.owner, due: task.due, status: task.status,
    ...(task.completedAt ? { completedAt: task.completedAt } : {}),
    ...(task.completionNote ? { completionNote: task.completionNote } : {}),
    ...(task.reportId ? { reportId: task.reportId } : {}),
    ...(task.careRuleId ? { careRuleId: task.careRuleId } : {}),
    associations: (links.get(task.id) ?? []).map((item): TaskAssociation => item.type === 'cat' || item.type === 'colony'
      ? { type: item.type, id: item.recordId! } : { type: item.type, label: item.label! }),
  }))
}

export async function listWorkspace(db: D1Database): Promise<Omit<WorkspaceSnapshot, 'aiAnalysisEnabled'>> {
  const [reports, tasks, members, careRules] = await Promise.all([
    listReports(db), listTasks(db),
    db.prepare("SELECT id, name FROM users WHERE status = 'active' AND task_assignable = 1 ORDER BY name COLLATE NOCASE, id").all<WorkspaceMember>(),
    listCareRules(db),
  ])
  return { reports, tasks, members: members.results, careRules }
}

function historyStatement(db: D1Database, reportId: string, actor: SessionUser, text: string) {
  return db.prepare('INSERT INTO report_history (id, report_id, actor_id, text, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), reportId, actor.id, `${actor.name} ${text}`, new Date().toISOString())
}

async function requireReport(db: D1Database, id: string) {
  const report = await db.prepare('SELECT id, title, status, colony_id AS colonyId, cat_id AS catId, care_note AS careNote, urgent, duplicate_of AS duplicateOf, reporter_id AS reporterId FROM reports WHERE id = ?')
    .bind(id).first<{ id: string; title: string; status: Report['status']; colonyId: string | null; catId: string | null; careNote: string; urgent: number; duplicateOf: string | null; reporterId: string | null }>()
  if (!report) throw new HTTPException(404, { message: 'Report not found.' })
  return report
}

async function validateLocation(db: D1Database, colonyId: string, catId: string) {
  if (colonyId && !await db.prepare('SELECT id FROM colonies WHERE id = ?').bind(colonyId).first()) throw new HTTPException(404, { message: 'Colony not found.' })
  if (catId && !await db.prepare('SELECT id FROM cats WHERE id = ? AND colony_id IS ?').bind(catId, colonyId || null).first()) throw new HTTPException(400, { message: 'Choose a cat in the selected colony.' })
}

export async function insertReport(db: D1Database, id: string, actor: SessionUser, input: CreateReportInput, files: StoredAttachment[]): Promise<void> {
  await validateLocation(db, input.colonyId, input.catId)
  const statements = [db.prepare(`INSERT INTO reports (id, title, message, category, reporter_id, submitted_at, colony_id, cat_id, urgent)
    VALUES (?, ?, ?, 'Field report', ?, ?, ?, ?, ?)`).bind(id, input.title, input.message, actor.id, new Date().toISOString(), input.colonyId || null, input.catId || null, Number(input.urgent))]
  for (const file of files) statements.push(db.prepare('INSERT INTO report_attachments (id, report_id, storage_key, name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(file.id, id, file.key, file.name, file.mimeType, file.size))
  statements.push(reportActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'report', summary: `Report submitted: ${input.title}`, occurredAt: new Date().toISOString(), reportId: id }))
  await db.batch(statements)
}

export async function finishReport(db: D1Database, id: string, actor: SessionUser, input: FinishReportInput): Promise<Report> {
  const report = await requireReport(db, id)
  if (isReportClosed(report.status)) throw new HTTPException(409, { message: 'This report has already been reviewed.' })
  const originalCat = (report.catId ?? '') === input.catId
  await validateLocation(db, input.colonyId, originalCat ? '' : input.catId)
  const changes: ActivityChange[] = [{ field: 'Status', before: report.status === 'waiting' ? 'Waiting for details' : 'Needs review', after: 'Reviewed' }]
  async function recordName(table: 'cats' | 'colonies', recordId: string | null) {
    if (!recordId) return ''
    return (await db.prepare(`SELECT name FROM ${table} WHERE id = ?`).bind(recordId).first<{ name: string }>())?.name ?? recordId
  }
  if ((report.colonyId ?? '') !== input.colonyId) changes.push({ field: 'Colony', before: await recordName('colonies', report.colonyId), after: await recordName('colonies', input.colonyId) })
  if ((report.catId ?? '') !== input.catId) changes.push({ field: 'Cat', before: await recordName('cats', report.catId), after: await recordName('cats', input.catId || null) })
  if (report.careNote !== input.careNote) changes.push({ field: 'Care note', before: report.careNote, after: input.careNote })
  if (Boolean(report.urgent) !== input.urgent) changes.push({ field: 'Urgent', before: report.urgent ? 'Yes' : 'No', after: input.urgent ? 'Yes' : 'No' })
  const event = { operationId: crypto.randomUUID(), actor, kind: 'report' as const, summary: `Report reviewed: ${report.title}`, changes, occurredAt: new Date().toISOString(), reportId: id }
  await db.batch([
    reportActivityStatement(db, id, event),
    db.prepare("UPDATE reports SET colony_id = ?, cat_id = ?, care_note = ?, urgent = ?, status = 'processed' WHERE id = ?")
      .bind(input.colonyId || null, input.catId || null, input.careNote, Number(input.urgent), id),
    reportActivityStatement(db, id, event),
    historyStatement(db, id, actor, 'saved the confirmed report details and finished the review.'),
  ])
  return (await listReports(db, id))[0]!
}

export async function dismissReport(db: D1Database, id: string, actor: SessionUser): Promise<Report> {
  const report = await requireReport(db, id)
  if (isReportClosed(report.status)) throw new HTTPException(409, { message: 'Reopen this report before dismissing it.' })
  await db.batch([
    db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").bind(id),
    historyStatement(db, id, actor, 'dismissed the report. No further action is needed.'),
    reportActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'report', summary: `Report dismissed: ${report.title}`, changes: [{ field: 'Status', before: report.status === 'waiting' ? 'Waiting for details' : 'Needs review', after: 'Dismissed' }], occurredAt: new Date().toISOString(), reportId: id }),
  ])
  return (await listReports(db, id))[0]!
}

export async function reopenReport(db: D1Database, id: string, actor: SessionUser): Promise<Report> {
  const report = await requireReport(db, id)
  if (!isReportClosed(report.status)) throw new HTTPException(409, { message: 'This report is already open.' })
  await db.batch([
    db.prepare("UPDATE reports SET status = 'pending', duplicate_of = NULL WHERE id = ?").bind(id),
    historyStatement(db, id, actor, 'reopened the report for review.'),
    reportActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'report', summary: `Report reopened: ${report.title}`, changes: [{ field: 'Status', before: report.status === 'dismissed' ? 'Dismissed' : 'Reviewed', after: 'Needs review' }], occurredAt: new Date().toISOString(), reportId: id }),
  ])
  return (await listReports(db, id))[0]!
}

export async function addQuestion(db: D1Database, id: string, actor: SessionUser, text: string): Promise<Report> {
  const report = await requireReport(db, id)
  if (isReportClosed(report.status)) throw new HTTPException(409, { message: 'Reopen this report before asking for details.' })
  if (!report.reporterId) throw new HTTPException(409, { message: 'Anonymous reports cannot receive questions.' })
  await db.batch([
    db.prepare("UPDATE reports SET status = 'waiting' WHERE id = ?").bind(id),
    db.prepare('INSERT INTO report_entries (id, report_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, actor.id, text, new Date().toISOString()),
    historyStatement(db, id, actor, 'requested more details.'),
    reportActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'report', summary: `More details requested: ${report.title}`, changes: report.status === 'waiting' ? [] : [{ field: 'Status', before: 'Needs review', after: 'Waiting for details' }], occurredAt: new Date().toISOString(), reportId: id }),
  ])
  return (await listReports(db, id))[0]!
}

export async function linkDuplicate(db: D1Database, id: string, targetId: string, actor: SessionUser): Promise<Report> {
  const [report, target] = await Promise.all([requireReport(db, id), requireReport(db, targetId)])
  if (id === targetId || !report.colonyId || report.colonyId !== target.colonyId || isReportClosed(report.status) || target.duplicateOf || target.status === 'dismissed') {
    throw new HTTPException(400, { message: 'Choose an existing report in the same colony.' })
  }
  const incoming = await db.prepare('SELECT id FROM reports WHERE duplicate_of = ? LIMIT 1').bind(id).first()
  if (incoming) throw new HTTPException(409, { message: 'This report already has linked duplicates.' })
  await db.batch([
    db.prepare("UPDATE reports SET status = 'processed', duplicate_of = ? WHERE id = ?").bind(targetId, id),
    historyStatement(db, id, actor, 'linked this duplicate to an existing report.'),
    reportActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'report', summary: `Duplicate report linked: ${report.title}`, changes: [{ field: 'Duplicate of', before: '', after: target.title }, { field: 'Status', before: report.status === 'waiting' ? 'Waiting for details' : 'Needs review', after: 'Reviewed' }], occurredAt: new Date().toISOString(), reportId: id }),
  ])
  return (await listReports(db, id))[0]!
}

async function validateTask(db: D1Database, input: TaskInput, currentOwnerId?: string) {
  if (input.ownerId !== currentOwnerId && !await db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active' AND task_assignable = 1").bind(input.ownerId).first()) {
    throw new HTTPException(400, { message: 'Choose a team member who can be assigned tasks.' })
  }
  if (input.reportId) await requireReport(db, input.reportId)
  for (const item of input.associations) {
    if (item.type === 'cat' && !await db.prepare('SELECT id FROM cats WHERE id = ?').bind(item.id).first()) throw new HTTPException(400, { message: 'A related cat was not found.' })
    if (item.type === 'colony' && !await db.prepare('SELECT id FROM colonies WHERE id = ?').bind(item.id).first()) throw new HTTPException(400, { message: 'A related colony was not found.' })
  }
}

function associationStatements(db: D1Database, taskId: string, associations: TaskAssociation[]) {
  return associations.map((item, index) => db.prepare('INSERT INTO task_associations (task_id, position, type, record_id, label) VALUES (?, ?, ?, ?, ?)')
    .bind(taskId, index, item.type, 'id' in item ? item.id : null, 'label' in item ? item.label : null))
}

async function describeAssociations(db: D1Database, items: TaskAssociation[]) {
  return (await Promise.all(items.map(async (item) => {
    if ('label' in item) return `${item.type}: ${item.label}`
    const table = item.type === 'cat' ? 'cats' : 'colonies'
    const record = await db.prepare(`SELECT name FROM ${table} WHERE id = ?`).bind(item.id).first<{ name: string }>()
    return `${item.type}: ${record?.name ?? item.id}`
  }))).join(', ')
}

async function requireEditableTask(db: D1Database, id: string, actor: SessionUser) {
  const task = await db.prepare('SELECT id, owner_id AS ownerId, report_id AS reportId FROM tasks WHERE id = ?')
    .bind(id).first<{ id: string; ownerId: string; reportId: string | null }>()
  if (!task) throw new HTTPException(404, { message: 'Task not found.' })
  if (task.ownerId !== actor.id && actor.role !== 'administrator') throw new HTTPException(403, { message: 'Only the assignee can update this task.' })
  return task
}

export async function createTask(db: D1Database, actor: SessionUser, input: TaskInput): Promise<Task> {
  await validateTask(db, input)
  const id = crypto.randomUUID()
  const owner = await db.prepare('SELECT name FROM users WHERE id = ?').bind(input.ownerId).first<{ name: string }>()
  const related = await describeAssociations(db, input.associations)
  const changes: ActivityChange[] = [{ field: 'Assignee', before: '', after: owner?.name ?? input.ownerId },
    ...(input.due ? [{ field: 'Due date', before: '', after: input.due }] : []),
    ...(related ? [{ field: 'Related items', before: '', after: related }] : [])]
  const statements = [db.prepare('INSERT INTO tasks (id, title, owner_id, report_id, due, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, input.title, input.ownerId, input.reportId ?? null, input.due, actor.id, new Date().toISOString()), ...associationStatements(db, id, input.associations)]
  if (input.reportId) statements.push(historyStatement(db, input.reportId, actor, `created a task: ${input.title}.`))
  statements.push(taskActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'task', summary: `Task created: ${input.title}`, changes, occurredAt: new Date().toISOString(), reportId: input.reportId }))
  await db.batch(statements)
  return (await listTasks(db, id))[0]!
}

export async function editTask(db: D1Database, id: string, actor: SessionUser, input: TaskInput): Promise<Task> {
  const existing = await requireEditableTask(db, id, actor)
  if ((input.reportId ?? null) !== existing.reportId) throw new HTTPException(400, { message: 'The linked report cannot be changed.' })
  await validateTask(db, input, existing.ownerId)
  const previous = (await listTasks(db, id))[0]!
  const newOwner = await db.prepare('SELECT name FROM users WHERE id = ?').bind(input.ownerId).first<{ name: string }>()
  const changes: ActivityChange[] = []
  function changed(field: string, before: string, after: string) { if (before !== after) changes.push({ field, before, after }) }
  changed('Title', previous.title, input.title)
  changed('Assignee', previous.owner, newOwner?.name ?? input.ownerId)
  changed('Due date', previous.due, input.due)
  if (JSON.stringify(previous.associations) !== JSON.stringify(input.associations)) changes.push({ field: 'Related items', before: await describeAssociations(db, previous.associations), after: await describeAssociations(db, input.associations) })
  const event = { operationId: crypto.randomUUID(), actor, kind: 'task' as const, summary: `Task updated: ${input.title}`, changes, occurredAt: new Date().toISOString(), reportId: existing.reportId ?? undefined }
  await db.batch([
    ...(changes.length ? [taskActivityStatement(db, id, event)] : []),
    db.prepare('UPDATE tasks SET title = ?, owner_id = ?, due = ? WHERE id = ?').bind(input.title, input.ownerId, input.due, id),
    db.prepare('DELETE FROM task_associations WHERE task_id = ?').bind(id),
    ...associationStatements(db, id, input.associations),
    ...(changes.length ? [taskActivityStatement(db, id, event)] : []),
    ...(existing.reportId ? [historyStatement(db, existing.reportId, actor, `updated a task: ${input.title}.`)] : []),
  ])
  return (await listTasks(db, id))[0]!
}

export async function changeTaskStatus(db: D1Database, id: string, actor: SessionUser, status: TaskStatus, completionNote = ''): Promise<Task> {
  const existing = await requireEditableTask(db, id, actor)
  const task = (await listTasks(db, id))[0]!
  if (task.status === status) return task
  const occurredAt = new Date().toISOString()
  await db.batch([
    db.prepare('UPDATE tasks SET status = ?, completed_at = ?, completion_note = ? WHERE id = ?').bind(status, status === 'completed' ? occurredAt : null, status === 'completed' ? completionNote || null : task.completionNote ?? null, id),
    ...(existing.reportId ? [historyStatement(db, existing.reportId, actor, `${status === 'completed' ? 'completed' : 'reopened'} task: ${task.title}.`)] : []),
    taskActivityStatement(db, id, { operationId: crypto.randomUUID(), actor, kind: 'task', summary: `Task ${status === 'completed' ? 'completed' : 'reopened'}: ${task.title}`, changes: [{ field: 'Status', before: task.status === 'open' ? 'Open' : 'Completed', after: status === 'open' ? 'Open' : 'Completed' }, ...(status === 'completed' && completionNote ? [{ field: 'Completion note', before: '', after: completionNote }] : [])], occurredAt, reportId: existing.reportId ?? undefined }),
  ])
  return (await listTasks(db, id))[0]!
}

export async function findAttachment(db: D1Database, id: string) {
  return db.prepare('SELECT storage_key AS key, name, mime_type AS mimeType FROM report_attachments WHERE id = ?').bind(id)
    .first<{ key: string; name: string; mimeType: string }>()
}
