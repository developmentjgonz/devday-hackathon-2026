import { HTTPException } from 'hono/http-exception'
import type { AutopilotSettings } from '../../shared/types/automation.ts'
import type { Colony, Directory } from '../../shared/types/directory.ts'
import type { Report, TaskAssociation } from '../../shared/types/workspace.ts'
import type { AutopilotReportPlan } from '../../shared/schemas/automation.ts'
import type { Bindings } from '../types.ts'
import { acquireAutomation, auditedDatabase, automationActor, automationEventStatement, autopilotConfiguration, finishAutomation, queueProposal, readProposal, recordAutomationEvent, reportFingerprint, type ProposalPayload } from '../db/automation.ts'
import { hasOpenAiConfiguration, openAiConfiguration } from '../db/configuration.ts'
import { configurationKey } from '../lib/configuration-secret.ts'
import { insertColony, listDirectory, saveCat, updateColonyLocation } from '../db/directory.ts'
import { createTask, editTask, finishReport, linkDuplicate, listReports, listTasks } from '../db/workspace.ts'
import { activityStatement } from '../db/record-activity.ts'
import { analysisDuplicateCandidates } from '../db/duplicate-reports.ts'
import { planAutopilotReport } from './autopilot-planner.ts'

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const path = (type: string, id: string) => `/app/${type}/${encodeURIComponent(id)}`
const errorMessage = (error: unknown) => error instanceof HTTPException ? error.message : 'This action could not be completed. Review it and try again.'

export function matchingColonies(a: Colony, b: Colony) {
  const left = normalize(a.name).replace(/\b(colony|cats)\b/g, '').trim()
  const right = normalize(b.name).replace(/\b(colony|cats)\b/g, '').trim()
  if (!left || left !== right || a.id === b.id) return false
  if (a.googlePlaceId && b.googlePlaceId) return a.googlePlaceId === b.googlePlaceId
  if (a.coordinates && b.coordinates) {
    const radians = Math.PI / 180
    const dx = (a.coordinates[0] - b.coordinates[0]) * Math.cos((a.coordinates[1] + b.coordinates[1]) / 2 * radians)
    const dy = a.coordinates[1] - b.coordinates[1]
    return Math.hypot(dx, dy) * 111_195 <= 100
  }
  return Boolean(a.address && b.address && normalize(a.address) === normalize(b.address))
}

async function availableOwner(db: D1Database) {
  return db.prepare(`SELECT u.id, u.name FROM users u LEFT JOIN tasks t ON t.owner_id = u.id AND t.status = 'open'
    WHERE u.status = 'active' AND u.task_assignable = 1 GROUP BY u.id ORDER BY COUNT(t.id), u.id LIMIT 1`).first<{ id: string; name: string }>()
}

async function verifyAction(env: Bindings, runId: string, feature: keyof AutopilotSettings, approved: boolean) {
  const actor = await automationActor(env.DB, runId, feature)
  if (!approved && (await autopilotConfiguration(env.DB)).settings.requireHumanReview) {
    throw new HTTPException(409, { message: 'Human review is now required. This action has stopped.' })
  }
  return actor
}

function validatePlan(report: Report, plan: AutopilotReportPlan, directory: Directory) {
  if (plan.duplicateReportId && (plan.tasks.length || plan.cats.length || plan.colony)) throw new HTTPException(409, { message: 'The duplicate plan also contains other changes. Review the report.' })
  if (plan.colony?.id && !directory.colonies.some((item) => item.id === plan.colony!.id)) throw new HTTPException(409, { message: 'The proposed colony no longer exists.' })
  if (plan.colony && !plan.colony.id && (!report.mapLocation || directory.colonies.some((item) => normalize(item.name) === normalize(plan.colony!.name)))) throw new HTTPException(409, { message: 'The proposed colony needs a location or matches an existing record. Review the report.' })
  const colonyId = plan.colony?.id ?? report.colonyId
  if (report.catId && plan.colony && plan.colony.id !== report.colonyId) throw new HTTPException(409, { message: 'A report with a linked cat cannot move to a different colony automatically.' })
  for (const cat of plan.cats) {
    const existing = cat.id ? directory.cats.find((item) => item.id === cat.id) : null
    if (cat.id && (!existing || (plan.colony && !plan.colony.id) || existing.colonyId !== colonyId || normalize(existing.name) !== normalize(cat.name))) throw new HTTPException(409, { message: 'The proposed cat does not match the colony and name. Review the report.' })
    if (!cat.id && directory.cats.some((item) => normalize(item.name) === normalize(cat.name) && item.colonyId === colonyId)) throw new HTTPException(409, { message: 'The proposed cat already has a record. Review the report.' })
  }
}

async function applyReport(env: Bindings, runId: string, report: Report, plan: AutopilotReportPlan, approved: boolean) {
  const db = env.DB
  const fresh = (await listReports(db, report.id))[0]
  if (!fresh || reportFingerprint(fresh) !== reportFingerprint(report)) throw new HTTPException(409, { message: 'The report changed after this plan was made. Review the current report.' })
  const directory = await listDirectory(db)
  validatePlan(report, plan, directory)
  const settings = (await autopilotConfiguration(db)).settings
  const reportPath = path('reports', report.id)
  let blocked = plan.needsReview
  if (plan.duplicateReportId) {
    if (!settings.resolveReports) throw new HTTPException(409, { message: 'Automatic report review is paused.' })
    const candidate = (await analysisDuplicateCandidates(db, report.id)).find((item) => item.id === plan.duplicateReportId)
    if (!candidate || plan.needsReview) throw new HTTPException(409, { message: 'The duplicate match needs more evidence. Review the report.' })
    const actor = await verifyAction(env, runId, 'resolveReports', approved)
    await linkDuplicate(auditedDatabase(db, runId, { kind: 'report', title: `Duplicate linked: ${report.title}`, detail: plan.summary, targetPath: reportPath, before: report, after: { duplicateOf: candidate.id } }), report.id, candidate.id, actor)
    return
  }
  let colonyId = report.colonyId
  let catId = report.catId
  if (plan.colony && settings.updateRecords) {
    const actor = await verifyAction(env, runId, 'updateRecords', approved)
    const existing = plan.colony.id ? directory.colonies.find((item) => item.id === plan.colony!.id)! : null
    if (existing) colonyId = existing.id
    if (!existing) {
      const location = report.mapLocation!
      const colony = await insertColony(auditedDatabase(db, runId, { kind: 'colony', title: `Colony created: ${plan.colony.name}`, detail: plan.colony.reason, targetPath: reportPath, after: plan.colony }), plan.colony.name, actor,
        location.type === 'pin' ? [location.longitude, location.latitude] : undefined, '', location.type === 'google-place' ? location.placeId : undefined)
      colonyId = colony.id
    } else if (!existing.coordinates && !existing.googlePlaceId && report.mapLocation) {
      const location = report.mapLocation
      await updateColonyLocation(auditedDatabase(db, runId, { kind: 'colony', title: `Colony location updated: ${existing.name}`, detail: plan.colony.reason, targetPath: path('colonies', existing.id), before: existing, after: location }), existing.id, actor,
        location.type === 'pin' ? [location.longitude, location.latitude] : null, '', location.type === 'google-place' ? location.placeId : undefined)
    }
  } else if (plan.colony) blocked = true
  for (const suggestion of plan.cats) {
    if (!settings.updateRecords || !colonyId) { blocked = true; continue }
    const actor = await verifyAction(env, runId, 'updateRecords', approved)
    // Refresh after each insert so a repeated suggestion cannot create twins.
    const current = await listDirectory(db)
    const existing = suggestion.id ? current.cats.find((item) => item.id === suggestion.id) : current.cats.find((item) => item.colonyId === colonyId && normalize(item.name) === normalize(suggestion.name))
    const note = `Report: ${suggestion.details}`
    const description = existing?.description?.includes(note) ? existing.description : [existing?.description, note].filter(Boolean).join('\n\n')
    if (description.length > 2000) { blocked = true; continue }
    if (existing?.description === description) { if (!catId) catId = existing.id; continue }
    const cat = await saveCat(auditedDatabase(db, runId, { kind: 'cat', title: `Cat ${existing ? 'updated' : 'created'}: ${suggestion.name}`, detail: `${suggestion.reason} ${suggestion.details}`, targetPath: existing ? path('cats', existing.id) : reportPath, before: existing, after: { name: suggestion.name, description, colonyId } }), {
      name: existing?.name ?? suggestion.name, colonyId, description, birthDate: existing?.birthDate ?? '', birthDateEstimated: existing?.birthDateEstimated ?? false,
    }, actor, existing?.id)
    if (!cat) throw new HTTPException(409, { message: 'The cat record could not be saved.' })
    if (!catId && plan.cats.length === 1) catId = cat.id
  }
  for (const suggestion of plan.tasks) {
    if (!settings.assignTasks) { blocked = true; continue }
    if ((await listTasks(db)).some((item) => item.reportId === report.id && normalize(item.title) === normalize(suggestion.title))) continue
    const owner = await availableOwner(db)
    if (!owner) { blocked = true; continue }
    const actor = await verifyAction(env, runId, 'assignTasks', approved)
    const associations: TaskAssociation[] = [...(colonyId ? [{ type: 'colony' as const, id: colonyId }] : []), ...(catId ? [{ type: 'cat' as const, id: catId }] : [])]
    await createTask(auditedDatabase(db, runId, { kind: 'task', title: `Task assigned: ${suggestion.title}`, detail: `${suggestion.reason} Assigned to ${owner.name} based on open task count.`, targetPath: reportPath, after: { title: suggestion.title, ownerId: owner.id, owner: owner.name, associations } }), actor,
      { title: suggestion.title, ownerId: owner.id, due: report.urgent ? new Date().toISOString().slice(0, 10) : '', reportId: report.id, associations })
  }
  if (catId && !(await listDirectory(db)).cats.some((item) => item.id === catId && item.colonyId === colonyId)) blocked = true
  if (!settings.resolveReports) return
  if (blocked) {
    await recordAutomationEvent(db, runId, { kind: 'review', title: `Report needs attention: ${report.title}`, detail: `${plan.summary} The report stays open because evidence or an enabled feature is missing.`, targetPath: reportPath })
    return
  }
  const beforeFinish = (await listReports(db, report.id))[0]
  if (!beforeFinish || reportFingerprint(beforeFinish) !== reportFingerprint(report)) throw new HTTPException(409, { message: 'The report changed while autopilot was working. Review the current report.' })
  const actor = await verifyAction(env, runId, 'resolveReports', approved)
  await finishReport(auditedDatabase(db, runId, { kind: 'report', title: `Report reviewed: ${report.title}`, detail: plan.summary, targetPath: reportPath, before: report, after: { reviewComplete: true, colonyId, catId } }), report.id, actor,
    { colonyId, catId, careNote: report.careNote, urgent: report.urgent })
}

async function applyMerge(env: Bindings, runId: string, source: Colony, target: Colony, approved: boolean) {
  const db = env.DB
  const directory = await listDirectory(db)
  const currentSource = directory.colonies.find((item) => item.id === source.id)
  const currentTarget = directory.colonies.find((item) => item.id === target.id)
  if (JSON.stringify(currentSource) !== JSON.stringify(source) || JSON.stringify(currentTarget) !== JSON.stringify(target) || !matchingColonies(source, target)) throw new HTTPException(409, { message: 'The colonies changed or no longer match. Review their records.' })
  const actor = await verifyAction(env, runId, 'mergeColonies', approved)
  const occurredAt = new Date().toISOString()
  const operationId = crypto.randomUUID()
  const movedCats = directory.cats.filter((cat) => cat.colonyId === source.id)
  const event = { operationId, actor, kind: 'profile' as const, summary: `Colony merged: ${source.name} into ${target.name}`, changes: [{ field: 'Colony', before: source.name, after: target.name }], occurredAt }
  await db.batch([
    ...movedCats.map((cat) => activityStatement(db, 'cat', cat.id, { ...event, summary: 'Colony updated after merge' })),
    // Keep both histories on the surviving colony, including overlapping events.
    db.prepare("UPDATE OR IGNORE record_activity SET record_id = ? WHERE record_type = 'colony' AND record_id = ?").bind(target.id, source.id),
    db.prepare("DELETE FROM record_activity WHERE record_type = 'colony' AND record_id = ?").bind(source.id),
    db.prepare('UPDATE cats SET colony_id = ? WHERE colony_id = ?').bind(target.id, source.id),
    db.prepare('UPDATE reports SET colony_id = ? WHERE colony_id = ?').bind(target.id, source.id),
    db.prepare("UPDATE task_associations SET record_id = ? WHERE type = 'colony' AND record_id = ?").bind(target.id, source.id),
    db.prepare('UPDATE care_rules SET colony_id = ? WHERE colony_id = ?').bind(target.id, source.id),
    db.prepare('UPDATE colonies SET photo_url = COALESCE(photo_url, ?) WHERE id = ?').bind(source.photoUrl ?? null, target.id),
    db.prepare('DELETE FROM colonies WHERE id = ?').bind(source.id),
    activityStatement(db, 'colony', target.id, event),
    automationEventStatement(db, runId, { kind: 'merge', title: `Colonies merged: ${source.name} → ${target.name}`, detail: `Names and locations match. Moved ${movedCats.length} cats and kept linked reports, tasks, care rules, and record history.`, targetPath: path('colonies', target.id), before: { source, target, cats: movedCats.map((cat) => cat.id) }, after: { colonyId: target.id } }),
    ...movedCats.map((cat) => automationEventStatement(db, runId, { kind: 'cat', title: `Cat colony updated: ${cat.name}`, detail: `Moved from ${source.name} to ${target.name} after the colony merge.`, targetPath: path('cats', cat.id), before: { colonyId: source.id }, after: { colonyId: target.id } })),
  ])
}

async function applyPayload(env: Bindings, runId: string, payload: ProposalPayload, approved: boolean) {
  if (payload.type === 'report') return applyReport(env, runId, payload.report, payload.plan, approved)
  if (payload.type === 'merge') return applyMerge(env, runId, payload.source, payload.target, approved)
  const current = (await listTasks(env.DB, payload.task.id))[0]
  if (!current || JSON.stringify(current) !== JSON.stringify(payload.task) || current.status !== 'open') throw new HTTPException(409, { message: 'The task changed. Review its current assignment.' })
  if (await env.DB.prepare("SELECT id FROM users WHERE id = ? AND status = 'active' AND task_assignable = 1").bind(current.ownerId).first()) throw new HTTPException(409, { message: 'The current assignee is available again. The assignment stays in place.' })
  const actor = await verifyAction(env, runId, 'assignTasks', approved)
  await editTask(auditedDatabase(env.DB, runId, { kind: 'task', title: `Task reassigned: ${current.title}`, detail: `Assigned to ${payload.ownerName} because the previous assignee is unavailable.`, targetPath: path('tasks', current.id), before: current, after: { ownerId: payload.ownerId, owner: payload.ownerName } }), current.id, actor, { ...current, ownerId: payload.ownerId })
}

async function handlePayload(env: Bindings, runId: string, subject: string, title: string, detail: string, changes: string[], payload: ProposalPayload) {
  await automationActor(env.DB, runId, payload.type === 'merge' ? 'mergeColonies' : payload.type === 'assignment' ? 'assignTasks' : 'enabled')
  const rejected = await env.DB.prepare("SELECT payload_json AS payload FROM automation_proposals WHERE subject_key = ? AND status = 'rejected' ORDER BY created_at DESC LIMIT 1").bind(subject).first<{ payload: string }>()
  if (rejected?.payload === JSON.stringify(payload)) return
  if ((await autopilotConfiguration(env.DB)).settings.requireHumanReview) await queueProposal(env.DB, runId, subject, title, detail, changes, payload)
  else await applyPayload(env, runId, payload, false)
}

export async function reviewAutomationProposal(env: Bindings, id: string, reviewerId: string, approve: boolean) {
  if (!(await autopilotConfiguration(env.DB)).settings.enabled) throw new HTTPException(409, { message: 'Enable autopilot before reviewing changes.' })
  const runId = await acquireAutomation(env.DB)
  if (!runId) throw new HTTPException(409, { message: 'Autopilot is working. Try again when this run finishes.' })
  let failed = false
  try {
    const proposal = await readProposal(env.DB, id)
    try {
      if (approve) await applyPayload(env, runId, proposal.payload, true)
      await env.DB.batch([
        env.DB.prepare('UPDATE automation_proposals SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?').bind(approve ? 'applied' : 'rejected', reviewerId, new Date().toISOString(), id),
        automationEventStatement(env.DB, runId, { kind: 'review', title: `${approve ? 'Approved' : 'Rejected'}: ${proposal.title}`, detail: proposal.detail, targetPath: '/app/automation', after: { reviewerId } }),
      ])
      if (!approve && proposal.payload.type === 'report') {
        await env.DB.prepare('UPDATE automation_report_attempts SET retry_after = 2147483647 WHERE report_id = ?').bind(proposal.payload.report.id).run()
      }
    } catch (error) {
      await env.DB.batch([
        env.DB.prepare("UPDATE automation_proposals SET status = 'failed', reviewed_by = ?, reviewed_at = ? WHERE id = ?").bind(reviewerId, new Date().toISOString(), id),
        automationEventStatement(env.DB, runId, { kind: 'error', title: `Review could not be applied: ${proposal.title}`, detail: errorMessage(error), targetPath: '/app/automation' }),
      ])
      throw error
    }
  } catch (error) { failed = true; throw error }
  finally { await finishAutomation(env.DB, runId, failed, failed ? 'The review could not be applied. Check activity.' : `Human review ${approve ? 'approved' : 'rejected'}.`) }
}

export async function runAutopilot(env: Bindings) {
  const { settings } = await autopilotConfiguration(env.DB)
  if (!settings.enabled) return
  const runId = await acquireAutomation(env.DB)
  if (!runId) return
  let failed = false
  try {
    await automationActor(env.DB, runId, 'enabled')
    const key = await configurationKey(env.CONFIG_ENCRYPTION_KEY)
    if (!await hasOpenAiConfiguration(env.DB, key)) throw new HTTPException(503, { message: 'Autopilot cannot access the OpenAI key. Check AI setup.' })
    // Turning review off releases existing proposals on the next run. Each
    // proposal is checked again against current records and enabled features.
    if (!settings.requireHumanReview) {
      const waiting = await env.DB.prepare("SELECT id FROM automation_proposals WHERE status = 'pending' ORDER BY created_at LIMIT 20").all<{ id: string }>()
      for (const { id } of waiting.results) {
        const proposal = await readProposal(env.DB, id)
        try {
          await applyPayload(env, runId, proposal.payload, false)
          await env.DB.prepare("UPDATE automation_proposals SET status = 'applied', reviewed_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run()
        } catch (error) {
          failed = true
          await env.DB.batch([
            env.DB.prepare("UPDATE automation_proposals SET status = 'failed' WHERE id = ?").bind(id),
            automationEventStatement(env.DB, runId, { kind: 'error', title: `Pending change could not be applied: ${proposal.title}`, detail: errorMessage(error), targetPath: '/app/automation' }),
          ])
        }
      }
    }
    if (settings.assignTasks) {
      const tasks = await listTasks(env.DB)
      const unavailable = await env.DB.prepare("SELECT t.id FROM tasks t JOIN users u ON u.id = t.owner_id WHERE t.status = 'open' AND (u.status <> 'active' OR u.task_assignable = 0) LIMIT 20").all<{ id: string }>()
      for (const item of unavailable.results) {
        const task = tasks.find((task) => task.id === item.id)!
        const owner = await availableOwner(env.DB)
        if (!owner) {
          await recordAutomationEvent(env.DB, runId, { kind: 'review', title: 'No team member is available', detail: 'Enable task assignment for an active team member before autopilot can assign work.', targetPath: '/app/team' })
          break
        }
        await handlePayload(env, runId, `assignment:${task.id}`, `Reassign ${task.title}`, 'The current assignee is unavailable.', [`Assign to ${owner.name}`], { type: 'assignment', task, ownerId: owner.id, ownerName: owner.name })
      }
    }
    if (settings.mergeColonies) {
      const directory = await listDirectory(env.DB)
      const consumed = new Set<string>()
      for (let i = 0; i < directory.colonies.length; i++) {
        const target = directory.colonies[i]!
        if (consumed.has(target.id)) continue
        for (const source of directory.colonies.slice(i + 1)) {
          if (consumed.has(source.id) || !matchingColonies(source, target)) continue
          await handlePayload(env, runId, `merge:${source.id}`, `Merge ${source.name} into ${target.name}`, 'The colony names and locations match.', ['Move cats, reports, task links, and care rules to the surviving colony.', 'Keep record history and remove the duplicate colony.'], { type: 'merge', source, target })
          consumed.add(source.id)
        }
      }
    }
    if (settings.resolveReports || settings.updateRecords || settings.assignTasks) {
      const reports = await listReports(env.DB)
      const attempts = await env.DB.prepare('SELECT report_id AS reportId, fingerprint, retry_after AS retryAfter FROM automation_report_attempts').all<{ reportId: string; fingerprint: string; retryAfter: number }>()
      const pending = await env.DB.prepare("SELECT subject_key AS subject FROM automation_proposals WHERE status = 'pending'").all<{ subject: string }>()
      const pendingKeys = new Set(pending.results.map((item) => item.subject))
      const byReport = new Map(attempts.results.map((item) => [item.reportId, item]))
      const selected = reports.filter((report) => {
        if (!['pending', 'waiting'].includes(report.status) || pendingKeys.has(`report:${report.id}`)) return false
        const attempt = byReport.get(report.id)
        return !attempt || attempt.fingerprint !== reportFingerprint(report) || attempt.retryAfter <= Date.now() / 1000
      }).sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.submittedAt.localeCompare(b.submittedAt)).slice(0, 5)
      const ai = selected.length ? await openAiConfiguration(env.DB, key) : null
      for (const report of selected) {
        try {
          await automationActor(env.DB, runId, 'enabled')
          if (!env.AI_ANALYSIS_RATE_LIMITER || !(await env.AI_ANALYSIS_RATE_LIMITER.limit({ key: 'workspace' })).success) throw new HTTPException(429, { message: 'The AI request limit was reached. Remaining reports will be retried.' })
          const [directory, tasks, candidates, attachments] = await Promise.all([
            listDirectory(env.DB), listTasks(env.DB), analysisDuplicateCandidates(env.DB, report.id),
            env.DB.prepare('SELECT storage_key AS key, name, mime_type AS mimeType, size FROM report_attachments WHERE report_id = ? ORDER BY rowid').bind(report.id).all<{ key: string; name: string; mimeType: string; size: number }>(),
          ])
          // Keep the model context bounded while including all linked records.
          const relatedDirectory = {
            colonies: [...directory.colonies.filter((colony) => colony.id === report.colonyId), ...directory.colonies.filter((colony) => colony.id !== report.colonyId)].slice(0, 200),
            cats: [...directory.cats.filter((cat) => cat.id === report.catId), ...directory.cats.filter((cat) => cat.colonyId === report.colonyId && cat.id !== report.catId)].slice(0, 200),
          }
          const plan = await planAutopilotReport(ai!, report, relatedDirectory, tasks.filter((task) => task.reportId === report.id), candidates, env.UPLOADS, attachments.results)
          validatePlan(report, plan, directory)
          if (plan.duplicateReportId && !settings.resolveReports) continue
          const changes = [
            ...(plan.duplicateReportId ? [`Link duplicate to report ${plan.duplicateReportId}`] : []),
            ...(settings.updateRecords && plan.colony ? [`${plan.colony.id ? 'Link or update' : 'Create'} colony: ${plan.colony.name}`] : []),
            ...(settings.updateRecords ? plan.cats.map((cat) => `${cat.id ? 'Update' : 'Create'} cat: ${cat.name}. ${cat.details}`) : []),
            ...(settings.assignTasks ? plan.tasks.map((task) => `Create and assign task: ${task.title}`) : []),
            ...(settings.resolveReports && !plan.duplicateReportId ? [plan.needsReview ? 'Keep the report open for more evidence.' : 'Finish the report review after supported changes.'] : []),
          ]
          if (!changes.length) continue
          await handlePayload(env, runId, `report:${report.id}`, `Review ${report.title}`, plan.summary, changes, { type: 'report', report, plan })
        } catch (error) {
          failed = true
          await recordAutomationEvent(env.DB, runId, { kind: 'error', title: `Report could not be processed: ${report.title}`, detail: errorMessage(error), targetPath: path('reports', report.id) })
        } finally {
          await env.DB.prepare('INSERT INTO automation_report_attempts (report_id, fingerprint, retry_after) VALUES (?, ?, unixepoch() + 3600) ON CONFLICT(report_id) DO UPDATE SET fingerprint = excluded.fingerprint, retry_after = excluded.retry_after')
            .bind(report.id, reportFingerprint(report)).run()
        }
      }
    }
  } catch (error) {
    failed = true
    await recordAutomationEvent(env.DB, runId, { kind: 'error', title: 'Autopilot could not finish', detail: errorMessage(error), targetPath: '/app/configuration/ai' })
  } finally {
    await finishAutomation(env.DB, runId, failed, failed ? 'Some actions need attention. Check activity for details.' : 'Autopilot checked the enabled features.')
  }
}
