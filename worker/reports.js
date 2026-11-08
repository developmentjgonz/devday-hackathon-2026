/** Protected care-case and outcome reporting service. Routes supply authenticated sessions. */

const MANAGERS = new Set(["admin", "coordinator"]);
const READERS = new Set(["admin", "coordinator", "volunteer", "sponsor"]);
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function sessionUser(session) { const user = session?.user; if (!user || !Number.isInteger(Number(user.id)) || !READERS.has(user.role)) fail("Authenticated session required", 401); return { id: Number(user.id), role: user.role }; }
function requireManager(session) { const user = sessionUser(session); if (!MANAGERS.has(user.role)) fail("Coordinator or admin access required", 403); return user; }
function id(value, field) { const output = String(value ?? "").trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(output) || output.length > 160) fail(`Invalid ${field}`); return output; }
function copy(value, field, max) { const output = String(value ?? "").trim(); if (!output || output.length > max) fail(`Invalid ${field}`); return output; }
function enumValue(value, allowed, field) { if (!allowed.includes(value)) fail(`Invalid ${field}`); return value; }
function when(value, end = false) { if (!value) return end ? "9999-12-31T23:59:59.999Z" : "0000-01-01T00:00:00.000Z"; const date = new Date(`${value}${/^\d{4}-\d{2}-\d{2}$/.test(value) ? end ? "T23:59:59.999Z" : "T00:00:00.000Z" : ""}`); if (Number.isNaN(date.valueOf())) fail("Invalid date filter"); return date.toISOString(); }
function stmt(db, sql, ...params) { if (!db?.prepare) fail("Database unavailable", 503); return db.prepare(sql).bind(...params); }
async function all(db, sql, ...params) { const result = await stmt(db, sql, ...params).all(); return result.results ?? result ?? []; }
async function first(db, sql, ...params) { return (await stmt(db, sql, ...params).first()) ?? null; }
function uuid() { return crypto.randomUUID?.() ?? `care-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export async function listCareCases({ db, session, from, to }) {
  const user = sessionUser(session); if (user.role === "sponsor") return { cases: [], notice: "Sponsors receive aggregate outcomes only." };
  const rows = await all(db, "SELECT c.id,c.canonical_cat_key,c.case_kind,c.priority,c.title,c.detail,c.status,c.outcome,c.evidence_note,c.opened_at,c.resolved_at,cc.canonical_cat_key AS canonical_key FROM care_cases c JOIN canonical_cats cc ON cc.cat_key=c.canonical_cat_key WHERE c.opened_at BETWEEN ? AND ? ORDER BY CASE c.status WHEN 'open' THEN 0 ELSE 1 END,c.opened_at DESC LIMIT 250", when(from), when(to, true));
  return { cases: rows.map((row) => ({ id: row.id, cat_key: row.canonical_key, case_kind: row.case_kind, priority: row.priority, title: row.title, detail: row.detail, status: row.status, outcome: row.outcome, evidence_note: row.evidence_note, opened_at: row.opened_at, resolved_at: row.resolved_at })) };
}

export async function createCareCase({ db, session, input, now = new Date().toISOString() }) {
  const user = requireManager(session); if (!input || typeof input !== "object") fail("Case details required");
  const catKey = id(input.canonicalCatKey, "canonical cat"); const kind = enumValue(input.caseKind, ["medical", "tnr"], "case kind"); const priority = enumValue(input.priority ?? "normal", ["urgent", "normal", "monitor"], "priority"); const title = copy(input.title, "title", 140); const detail = copy(input.detail, "details", 1200); const sourceObservationId = input.sourceObservationId ? id(input.sourceObservationId, "source observation") : null;
  const caseId = uuid(); const eventId = uuid();
  const insert = stmt(db, "INSERT INTO care_cases (id,canonical_cat_key,source_observation_id,case_kind,priority,title,detail,opened_by,opened_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM canonical_cats WHERE cat_key=? AND status='active') AND (? IS NULL OR EXISTS (SELECT 1 FROM intake_observations WHERE id=?))", caseId, catKey, sourceObservationId, kind, priority, title, detail, user.id, now, catKey, sourceObservationId, sourceObservationId);
  const event = stmt(db, "INSERT INTO care_case_events (id,care_case_id,actor_id,action,summary,created_at) SELECT ?,?,?, 'created', ?,? WHERE EXISTS (SELECT 1 FROM care_cases WHERE id=?)", eventId, caseId, user.id, `${kind} case opened`, now, caseId);
  const results = db.batch ? await db.batch([insert, event]) : [await insert.run(), await event.run()]; const changes = Number(results?.[0]?.meta?.changes ?? 0); if (changes !== 1) fail("Cat record or source observation was not available", 409);
  return { id: caseId, status: "open", case_kind: kind, priority, opened_at: now };
}

export async function resolveCareCase({ db, session, input, now = new Date().toISOString() }) {
  const user = requireManager(session); if (!db?.batch) fail("Atomic database updates are required", 503); if (!input || typeof input !== "object") fail("Resolution details required");
  const caseId = id(input.id, "case ID"); const outcome = enumValue(input.outcome, ["medical_resolved", "tnr_completed", "tnr_not_completed", "monitoring"], "outcome"); const evidence = copy(input.evidenceNote, "documented evidence", 1200);
  const eventId = uuid();
  const update = stmt(db, "UPDATE care_cases SET status='resolved',outcome=?,evidence_note=?,resolved_by=?,resolved_at=? WHERE id=? AND status='open' AND ((case_kind='medical' AND ? IN ('medical_resolved','monitoring')) OR (case_kind='tnr' AND ? IN ('tnr_completed','tnr_not_completed','monitoring')))", outcome, evidence, user.id, now, caseId, outcome, outcome);
  // `changes()` refers to the immediately preceding guarded UPDATE in this batch.
  // It prevents a retry with the same timestamp from appending an audit event.
  const event = stmt(db, "INSERT INTO care_case_events (id,care_case_id,actor_id,action,summary,created_at) SELECT ?,id,?,'resolved',?,? FROM care_cases WHERE id=? AND status='resolved' AND resolved_at=? AND changes()=1", eventId, user.id, `Outcome documented: ${outcome}`, now, caseId, now);
  const results = await db.batch([update, event]); if (Number(results?.[0]?.meta?.changes ?? 0) !== 1) fail("Case is closed, missing, or does not allow that outcome", 409);
  return { id: caseId, status: "resolved", outcome, resolved_at: now };
}

export async function getOutcomeReport({ db, session, from, to }) {
  const user = sessionUser(session); const start = when(from), end = when(to, true);
  const [opened, resolved, pending] = await Promise.all([
    all(db, "SELECT case_kind,COUNT(*) AS count FROM care_cases WHERE opened_at BETWEEN ? AND ? GROUP BY case_kind", start, end),
    all(db, "SELECT case_kind,outcome,COUNT(*) AS count FROM care_cases WHERE resolved_at BETWEEN ? AND ? GROUP BY case_kind,outcome", start, end),
    all(db, "SELECT case_kind,COUNT(*) AS count FROM care_cases WHERE status='open' GROUP BY case_kind"),
  ]);
  const lookup = (rows, predicate) => Number(rows.find(predicate)?.count ?? 0); const medicalOpened = lookup(opened, (row) => row.case_kind === "medical"); const tnrOpened = lookup(opened, (row) => row.case_kind === "tnr"); const medicalResolved = lookup(resolved, (row) => row.case_kind === "medical" && row.outcome === "medical_resolved"); const tnrCompleted = lookup(resolved, (row) => row.case_kind === "tnr" && row.outcome === "tnr_completed");
  return { window: { start, end }, metrics: { medical_cases_opened_in_window: medicalOpened, documented_medical_cases_resolved_in_window: medicalResolved, medical_resolution_denominator: medicalOpened, tnr_cases_opened_in_window: tnrOpened, documented_tnr_completed_in_window: tnrCompleted, tnr_completion_denominator: tnrOpened, tnr_pending_now: lookup(pending, (row) => row.case_kind === "tnr"), medical_open_now: lookup(pending, (row) => row.case_kind === "medical") }, access: user.role, disclaimer: "Outcomes are counted only when a coordinator or admin records a documented resolution. Unknown outcomes are not inferred; TNR pending is an open-care-case count (not a unique-cat count) and is a current snapshot, not a window rate." };
}

/** Explicit care outcomes for census projection. Unknown keys are intentionally omitted. */
export async function getCareOutcomeStates(db) {
  // Resolve through the current canonical root so an approved human dedupe merge
  // does not strand care history on the retired candidate key. The care case IDs,
  // source links, and audit rows remain attached to their original cat key.
  const rows = await all(db, "SELECT cc.canonical_cat_key AS resolved_root_key,c.case_kind,c.status,c.outcome,c.resolved_at FROM care_cases c JOIN canonical_cats cc ON cc.cat_key=c.canonical_cat_key ORDER BY COALESCE(c.resolved_at, c.opened_at) DESC");
  const states = {};
  for (const row of rows) {
    const current = states[row.resolved_root_key] ?? { medical: "unknown", tnr: "unknown", fixed: null };
    if (row.case_kind === "medical" && current.medical === "unknown") current.medical = row.status === "open" ? "open" : row.outcome;
    if (row.case_kind === "tnr" && current.tnr === "unknown") { current.tnr = row.status === "open" ? "pending" : row.outcome; if (row.outcome === "tnr_completed") current.fixed = true; if (row.outcome === "tnr_not_completed") current.fixed = false; }
    states[row.resolved_root_key] = current;
  }
  return states;
}

export function outcomeReportCsv(report) {
  const esc = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`; const rows = [["metric", "value", "window_start", "window_end", "definition"]];
  const definitions = { medical_cases_opened_in_window: "Medical care cases opened in the selected window", documented_medical_cases_resolved_in_window: "Medical cases with documented medical_resolved outcome in window", medical_resolution_denominator: "Medical care cases opened in selected window; not a cohort completion rate", tnr_cases_opened_in_window: "TNR care cases opened in selected window", documented_tnr_completed_in_window: "TNR cases with documented tnr_completed outcome in window", tnr_completion_denominator: "TNR cases opened in selected window; not a cohort completion rate", tnr_pending_now: "Open TNR cases at query time", medical_open_now: "Open medical care cases at query time" };
  for (const [metric, value] of Object.entries(report.metrics)) rows.push([metric, value, report.window.start, report.window.end, definitions[metric] ?? "Documented aggregate"]);
  return `${rows.map((row) => row.map(esc).join(",")).join("\n")}\n`;
}
