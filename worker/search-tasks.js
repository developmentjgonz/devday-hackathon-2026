const TEAM_ROLES = new Set(["admin", "coordinator", "volunteer"]);
const MANAGER_ROLES = new Set(["admin", "coordinator"]);
const VALID_STATUSES = new Set(["assigned", "completed", "blocked", "cancelled"]);
const MAX_TEXT = 1000;

function nowIso() { return new Date().toISOString(); }
function validText(value, max = MAX_TEXT) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max; }
function validIso(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function taskId() { return crypto.randomUUID(); }
function actor(session) { return Number(session?.userId ?? session?.user?.id); }
function role(session) { return session?.user?.role; }
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function assertRole(session, allowed) { if (!session || !allowed.has(role(session)) || !Number.isInteger(actor(session))) fail("Insufficient role", 403); }
function normalizeCoordinate(value) { if (value === undefined || value === null || value === "") return null; const number = Number(value); return Number.isFinite(number) && number >= -90 && number <= 90 ? number : NaN; }
function safeChecklist(checklist) { return checklist && checklist.publicAccessPermission === true && checklist.noFloodwaterOrDrains === true && checklist.noTrafficEntry === true; }
function forecastIsSevere(forecast) { return forecast?.severity === "severe" || forecast?.dispatchBlocked === true; }
function publicTask(row) { return { id: row.id, title: row.title, broadArea: row.broad_area, canonicalCatKey: row.canonical_cat_key, assignedUserId: Number(row.assigned_user_id), assignedEmail: row.assigned_email, status: row.status, dueAt: row.due_at, forecastSource: row.forecast_source, forecastSeverity: row.forecast_severity, forecastCheckedAt: row.forecast_checked_at, riskVerifiedHuman: Boolean(row.risk_verified_human), createdAt: row.created_at, completedAt: row.completed_at, blockedAt: row.blocked_at, evidenceTimestamp: row.evidence_timestamp, evidenceNote: row.evidence_note, blockReason: row.block_reason, fictionalLatitude: row.fictional_latitude, fictionalLongitude: row.fictional_longitude }; }

async function activeAssignee(db, userId) { return db.prepare("SELECT id FROM users WHERE id = ? AND disabled_at IS NULL AND role IN ('admin','coordinator','volunteer') LIMIT 1").bind(userId).first(); }
function audit(db, task, userId, event, detail, timestamp) { return db.prepare("INSERT INTO search_task_audit (id, task_id, actor_id, event, detail_json, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE changes()=1").bind(taskId(), task, userId, event, JSON.stringify(detail), timestamp); }

/** GET handler backend. Sponsors/public are deliberately rejected so no task geography leaks through this resource. */
export async function listSearchTasks({ db, session }) {
  assertRole(session, TEAM_ROLES);
  const isVolunteer = role(session) === "volunteer";
  const rows = await db.prepare("SELECT t.*, u.email AS assigned_email FROM search_tasks t JOIN users u ON u.id = t.assigned_user_id WHERE (? = 0 OR t.assigned_user_id = ?) ORDER BY CASE t.status WHEN 'assigned' THEN 0 WHEN 'blocked' THEN 1 ELSE 2 END, t.due_at ASC LIMIT 200").bind(isVolunteer ? 1 : 0, actor(session)).all();
  return { synthetic: true, tasks: (rows.results ?? []).map(publicTask) };
}

/** POST create handler: manager-only, with deterministic dispatch gates. */
export async function createSearchTask({ db, session, body, now = nowIso() }) {
  assertRole(session, MANAGER_ROLES);
  if (!body || !validText(body.title, 160) || !validText(body.broadArea, 120) || !Number.isInteger(body.assignedUserId) || !validIso(body.dueAt)) fail("Invalid search task");
  if (!safeChecklist(body.safeAccessChecklist)) fail("Safe-access checklist must confirm public permission, no floodwater/drains, and no traffic entry");
  if (body.riskVerifiedHuman !== true) fail("A human must verify current field risk before dispatch");
  if (forecastIsSevere(body.forecast)) fail("Severe weather blocks dispatch; create or assign only after conditions are cleared by a human");
  const latitude = normalizeCoordinate(body.fictionalLatitude); const longitude = body.fictionalLongitude === undefined || body.fictionalLongitude === null || body.fictionalLongitude === "" ? null : Number(body.fictionalLongitude);
  if (Number.isNaN(latitude) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) fail("Invalid fictional coordinates");
  if (body.canonicalCatKey !== undefined && body.canonicalCatKey !== null && !validText(body.canonicalCatKey, 120)) fail("Invalid canonical cat reference");
  if (body.canonicalCatKey) { const cat = await db.prepare("SELECT cat_key FROM canonical_cats WHERE cat_key = ? AND status = 'active' AND canonical_cat_key = cat_key LIMIT 1").bind(body.canonicalCatKey).first(); if (!cat) fail("Canonical cat must be an active root record"); }
  const assignee = await activeAssignee(db, body.assignedUserId); if (!assignee) fail("Active team member not found");
  const id = taskId(); const dueAt = new Date(body.dueAt).toISOString(); const forecast = body.forecast ?? {}; const actorId = actor(session);
  await db.batch([
    db.prepare("INSERT INTO search_tasks (id,title,broad_area,canonical_cat_key,fictional_latitude,fictional_longitude,assigned_user_id,status,safe_public_access,no_floodwater_or_drains,no_traffic_entry,risk_verified_human,risk_verified_at,forecast_source,forecast_severity,forecast_checked_at,created_by,created_at,due_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, body.title.trim(), body.broadArea.trim(), body.canonicalCatKey?.trim() || null, latitude, longitude, body.assignedUserId, "assigned", 1, 1, 1, 1, now, typeof forecast.source === "string" ? forecast.source.slice(0, 200) : null, typeof forecast.severity === "string" ? forecast.severity.slice(0, 30) : "unknown", validIso(forecast.checkedAt) ? new Date(forecast.checkedAt).toISOString() : null, actorId, now, dueAt),
    db.prepare("INSERT INTO search_task_audit (id,task_id,actor_id,event,detail_json,created_at) VALUES (?,?,?,?,?,?)").bind(taskId(), id, actorId, "created_and_dispatched", JSON.stringify({ safeAccessChecklist: body.safeAccessChecklist, riskVerifiedHuman: true, forecast: { source: forecast.source ?? null, severity: forecast.severity ?? "unknown" } }), now),
  ]);
  return { ok: true, id, status: "assigned", note: "Task dispatched after the required human safety verification." };
}

/** POST update handler: a volunteer can complete/block only their own task; managers may reassign. */
export async function updateSearchTask({ db, session, body, now = nowIso() }) {
  assertRole(session, TEAM_ROLES);
  if (!body || !validText(body.id, 80) || !["complete", "block", "reassign"].includes(body.action)) fail("Invalid task update");
  const task = await db.prepare("SELECT * FROM search_tasks WHERE id = ? LIMIT 1").bind(body.id).first();
  if (!task || !VALID_STATUSES.has(task.status) || task.status !== "assigned") fail("Task is not open", 409);
  const actorId = actor(session); const manager = MANAGER_ROLES.has(role(session));
  if (!manager && (Number(task.assigned_user_id) !== actorId || !["complete", "block"].includes(body.action))) fail("This task is not assigned to you", 403);
  if (body.action === "reassign") {
    if (!manager || !Number.isInteger(body.assignedUserId)) fail("Only a manager can reassign a task", 403);
    if (!await activeAssignee(db, body.assignedUserId)) fail("Active team member not found");
    const results = await db.batch([db.prepare("UPDATE search_tasks SET assigned_user_id = ? WHERE id = ? AND status = 'assigned'").bind(body.assignedUserId, task.id), audit(db, task.id, actorId, "reassigned", { assignedUserId: body.assignedUserId }, now)]);
    if (!results[0].meta?.changes) fail("Task changed before reassignment", 409);
    return { ok: true, action: "reassign" };
  }
  if (!validIso(body.evidenceTimestamp) || !validText(body.evidenceNote, MAX_TEXT)) fail("A timestamped evidence note is required");
  if (body.action === "block" && !validText(body.blockReason, 500)) fail("A block reason is required");
  const status = body.action === "complete" ? "completed" : "blocked";
  const results = await db.batch([db.prepare("UPDATE search_tasks SET status = ?, completed_at = ?, blocked_at = ?, evidence_timestamp = ?, evidence_note = ?, block_reason = ? WHERE id = ? AND status = 'assigned' AND (? = 1 OR assigned_user_id = ?)").bind(status, status === "completed" ? now : null, status === "blocked" ? now : null, new Date(body.evidenceTimestamp).toISOString(), body.evidenceNote.trim(), status === "blocked" ? body.blockReason.trim() : null, task.id, manager ? 1 : 0, actorId), audit(db, task.id, actorId, status, { evidenceTimestamp: body.evidenceTimestamp, evidenceNote: body.evidenceNote, blockReason: body.blockReason ?? null }, now)]);
  if (!results[0].meta?.changes) fail("Task changed or is no longer assigned to you", 409);
  return { ok: true, action: body.action, status };
}

export const searchTaskSafety = { safeChecklist, forecastIsSevere };
